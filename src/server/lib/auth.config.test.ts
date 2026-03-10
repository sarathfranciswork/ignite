import { describe, it, expect } from "vitest";
import { authConfig } from "./auth.config";

type AuthorizedParams = {
  auth: { user?: Record<string, unknown> } | null;
  request: { nextUrl: URL };
};

const authorizedCallback = authConfig.callbacks!.authorized! as (
  params: AuthorizedParams,
) => boolean | Response;

function createParams(pathname: string, user?: Record<string, unknown> | null): AuthorizedParams {
  return {
    auth: user === null ? null : user ? { user } : null,
    request: { nextUrl: new URL(pathname, "http://localhost:3000") },
  };
}

describe("auth.config authorized callback", () => {
  it("sets trustHost to true", () => {
    expect(authConfig.trustHost).toBe(true);
  });

  describe("public paths", () => {
    it.each(["/", "/login", "/register"])("allows %s without auth", (path) => {
      const result = authorizedCallback(createParams(path));
      expect(result).toBe(true);
    });

    it("allows /login/error without auth", () => {
      const result = authorizedCallback(createParams("/login/error"));
      expect(result).toBe(true);
    });

    it("allows /register/verify without auth", () => {
      const result = authorizedCallback(createParams("/register/verify"));
      expect(result).toBe(true);
    });
  });

  describe("protected routes", () => {
    it("denies unauthenticated users on /dashboard", () => {
      const result = authorizedCallback(createParams("/dashboard"));
      expect(result).toBe(false);
    });

    it("denies unauthenticated users on /campaigns", () => {
      const result = authorizedCallback(createParams("/campaigns"));
      expect(result).toBe(false);
    });

    it("allows authenticated users on /dashboard", () => {
      const result = authorizedCallback(
        createParams("/dashboard", { id: "user-1", globalRole: "PARTICIPANT" }),
      );
      expect(result).toBe(true);
    });

    it("allows authenticated users on /campaigns", () => {
      const result = authorizedCallback(
        createParams("/campaigns", { id: "user-1", globalRole: "PARTICIPANT" }),
      );
      expect(result).toBe(true);
    });
  });

  describe("admin routes", () => {
    it("denies unauthenticated users", () => {
      const result = authorizedCallback(createParams("/admin/users"));
      expect(result).toBe(false);
    });

    it("redirects non-admin users to /dashboard", () => {
      const result = authorizedCallback(
        createParams("/admin/users", { id: "user-1", globalRole: "PARTICIPANT" }),
      );
      expect(result).toBeInstanceOf(Response);
      const response = result as Response;
      expect(response.status).toBe(302);
      expect(new URL(response.headers.get("location")!).pathname).toBe("/dashboard");
    });

    it("allows PLATFORM_ADMIN to access admin routes", () => {
      const result = authorizedCallback(
        createParams("/admin/users", { id: "user-1", globalRole: "PLATFORM_ADMIN" }),
      );
      expect(result).toBe(true);
    });

    it("allows INNOVATION_MANAGER to access admin routes", () => {
      const result = authorizedCallback(
        createParams("/admin/org-units", { id: "user-1", globalRole: "INNOVATION_MANAGER" }),
      );
      expect(result).toBe(true);
    });
  });
});
