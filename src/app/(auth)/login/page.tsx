"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"credentials" | "magic-link">("credentials");
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMagicLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("email", {
        email,
        redirect: false,
      });

      if (result?.error) {
        setError("Failed to send magic link. Please try again.");
      } else {
        setMagicLinkSent(true);
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  if (magicLinkSent) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
            <Mail className="h-6 w-6 text-primary-600" />
          </div>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We sent a magic link to <span className="font-medium text-gray-900">{email}</span>.
            Click the link in the email to sign in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="ghost" className="w-full" onClick={() => setMagicLinkSent(false)}>
            Use a different email
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
          <LogIn className="h-6 w-6 text-primary-600" />
        </div>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to your Ignite account</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "credentials" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
            onClick={() => setMode("credentials")}
          >
            Password
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "magic-link" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
            onClick={() => setMode("magic-link")}
          >
            Magic Link
          </button>
        </div>

        {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        {mode === "credentials" ? (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sign In
            </Button>
          </form>
        ) : (
          <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="magic-email">Email</Label>
              <Input
                id="magic-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send Magic Link
            </Button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-primary-600 hover:text-primary-500">
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
