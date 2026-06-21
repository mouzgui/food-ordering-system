"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_HOME_ROUTE } from "@/types";
import type { StaffRole } from "@/types/database";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const supabase = createClient();
      
      // If the user entered a username instead of an email, format it
      const formattedEmail = email.includes("@") 
        ? email 
        : `${email.toLowerCase()}@staff.local`;

      const { error } = await supabase.auth.signInWithPassword({
        email: formattedEmail,
        password,
      });

      if (error) {
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      let destination = "/overview";
      if (user) {
        const { data: member } = (await supabase
          .from("restaurant_members")
          .select("role")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .limit(1)
          .single()) as any;

        if (member?.role) {
          destination = ROLE_HOME_ROUTE[member.role as StaffRole];
        }
      }

      toast.success("Welcome back!");
      router.push(destination);
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <Card className="border-border/50 shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">{t("auth.login")}</CardTitle>
        <CardDescription>
          Enter your credentials to access your dashboard
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-email">{t("auth.email")} or Username</Label>
            <Input
              id="login-email"
              type="text"
              placeholder="you@restaurant.com or ahmed_kitchen"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password">{t("auth.password")}</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-primary hover:underline"
              >
                {t("auth.forgotPassword")}
              </Link>
            </div>
            <Input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {t("common.loading")}
              </span>
            ) : (
              t("auth.login")
            )}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {t("auth.noAccount")}{" "}
            <Link
              href="/register"
              className="text-primary hover:underline font-medium"
            >
              {t("auth.register")}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
