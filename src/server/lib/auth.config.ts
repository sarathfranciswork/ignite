import type { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

/**
 * Edge-compatible auth configuration for use in Next.js middleware.
 * This config MUST NOT import Node.js-only modules (Prisma, bcryptjs, events, pino).
 * The full auth config in auth.ts extends this with adapter and authorize logic.
 */
export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/dashboard",
  },
  providers: [
    // Credentials provider defined here for type compatibility;
    // the actual authorize function is overridden in auth.ts
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: () => null,
    }),
    // SSO provider stub for edge compatibility;
    // the actual authorize function is overridden in auth.ts
    CredentialsProvider({
      id: "sso",
      name: "SSO",
      credentials: {
        providerId: { label: "Provider ID", type: "text" },
        externalId: { label: "External ID", type: "text" },
        attributes: { label: "Attributes", type: "text" },
        groups: { label: "Groups", type: "text" },
      },
      authorize: () => null,
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isAuthenticated = !!auth?.user;
      const pathname = nextUrl.pathname;

      const isPublicPath =
        pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/register");

      if (isPublicPath) {
        return true;
      }

      // Allow access to verify-2fa page without full auth
      if (pathname.startsWith("/verify-2fa")) {
        return isAuthenticated;
      }

      if (!isAuthenticated) {
        return false; // NextAuth will redirect to signIn page
      }

      // Check if user needs 2FA verification — redirect to verify-2fa page
      const token = auth as unknown as Record<string, unknown> | null;
      const requires2fa = token && "requires2fa" in token ? token.requires2fa : false;
      const twoFactorVerified =
        token && "twoFactorVerified" in token ? token.twoFactorVerified : false;

      if (requires2fa && !twoFactorVerified && !pathname.startsWith("/api")) {
        return Response.redirect(new URL("/verify-2fa", nextUrl.origin));
      }

      const user = auth?.user;
      const role = user && "globalRole" in user ? user.globalRole : undefined;
      const twoFactorPending =
        user && "twoFactorPending" in user ? user.twoFactorPending : undefined;

      // Users with pending 2FA can only access the verification page
      if (twoFactorPending === true) {
        if (!pathname.startsWith("/verify-2fa")) {
          return Response.redirect(new URL("/verify-2fa", nextUrl.origin));
        }
        return true;
      }

      // Prevent verified users from accessing the 2FA verification page
      if (pathname.startsWith("/verify-2fa")) {
        return Response.redirect(new URL("/dashboard", nextUrl.origin));
      }

      // Admin routes require PLATFORM_ADMIN or INNOVATION_MANAGER role
      if (pathname.startsWith("/admin")) {
        if (role !== "PLATFORM_ADMIN" && role !== "INNOVATION_MANAGER") {
          return Response.redirect(new URL("/dashboard", nextUrl.origin));
        }
      }

      // External users can only access /external, /profile, /api, and campaign detail pages
      if (role === "EXTERNAL") {
        const allowedPaths = ["/external", "/profile", "/api"];
        const isAllowed =
          allowedPaths.some((p) => pathname.startsWith(p)) || /^\/campaigns\/[^/]+$/.test(pathname);
        if (!isAllowed) {
          return Response.redirect(new URL("/external", nextUrl.origin));
        }
      }

      return true;
    },
  },
};
