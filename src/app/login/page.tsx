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
    <main className="flex min-h-screen items-center justify-center bg-muted/20 px-6 py-12">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 text-center">
          <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-foreground text-sm font-semibold text-background">
          ⚡︎
          </div>

          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            Leadbase
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to your private workspace.
          </p>
        </div>

        <Card className="shadow-none">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg border">
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
                />
              </div>

              {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <Button type="submit" className="w-full">
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