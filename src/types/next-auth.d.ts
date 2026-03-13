import "next-auth";
import type { GlobalRole } from "@prisma/client";

declare module "next-auth" {
  interface User {
    requires2fa?: boolean;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      globalRole?: GlobalRole;
      twoFactorPending?: boolean;
      requires2fa?: boolean;
      twoFactorVerified?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    globalRole?: GlobalRole;
    twoFactorPending?: boolean;
    requires2fa?: boolean;
    twoFactorVerified?: boolean;
  }
}
