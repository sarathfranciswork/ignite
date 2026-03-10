import { PrismaAdapter } from "@next-auth/prisma-adapter";
import {
  getServerSession,
  type DefaultSession,
  type NextAuthOptions,
} from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { type GlobalRole } from "@prisma/client";
import { db } from "~/server/lib/prisma";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      globalRole: GlobalRole;
    } & DefaultSession["user"];
  }

  interface User {
    globalRole: GlobalRole;
  }
}

export const authOptions: NextAuthOptions = {
  callbacks: {
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.sub,
        globalRole: token.globalRole as GlobalRole,
      },
    }),
    jwt: async ({ token, user }) => {
      if (user) {
        token.globalRole = user.globalRole;
      }
      return token;
    },
  },
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          return null;
        }

        // TODO: Add proper password hashing verification in Story 1.2
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          globalRole: user.globalRole,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
};

export const getServerAuthSession = () => getServerSession(authOptions);
