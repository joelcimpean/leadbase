import { LockKeyhole } from "lucide-react";

import { login } from "./actions";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({
  searchParams,
}: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.38] dark:opacity-[0.16]"
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in srgb, var(--border) 36%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--border) 36%, transparent) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(circle at center, black 0%, transparent 72%)",
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[14%] h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl dark:bg-primary/12"
      />

      <div className="relative z-10 w-full max-w-[430px]">
        <div className="mb-8 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 ring-1 ring-primary/20">
            ⚡︎
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.035em]">
            Leadbase
          </h1>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Sign in to your private workspace.
          </p>
        </div>

        <Card className="border-border/70 bg-card/95 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm dark:shadow-[0_24px_70px_rgba(0,0,0,0.24)]">
          <CardContent className="p-6 sm:p-7">
            <div className="flex items-center gap-3.5">
              <div className="flex size-10 items-center justify-center rounded-xl border border-primary/15 bg-primary/[0.055] text-primary">
                <LockKeyhole className="size-4" />
              </div>

              <div>
                <h2 className="text-sm font-semibold">Welcome back</h2>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  Enter your account credentials.
                </p>
              </div>
            </div>

            <form action={login} className="mt-7 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>

                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="hello@joelcimpean.com"
                  autoComplete="email"
                  required
                  className="h-11 bg-background/70"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>

                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  className="h-11 bg-background/70"
                />
              </div>

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700 dark:border-red-950 dark:bg-red-950/35 dark:text-red-300">
                  {error}
                </div>
              ) : null}

              <Button type="submit" className="h-11 w-full shadow-sm shadow-primary/20">
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Private workspace · No public registration
        </p>
      </div>
    </main>
  );
}
