"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const supabase = createClient();
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      setIsSubmitted(true);
      toast.success("Password reset email sent!");
    } catch {
      toast.error("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="w-full max-w-md animate-fade-in relative">
        {/* Glowing Background Blob */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="relative rounded-[2.5rem] bg-black/40 border border-white/10 backdrop-blur-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-50" />
          
          <div className="p-10 text-center relative z-10 flex flex-col items-center">
            <div className="h-24 w-24 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30 mb-8 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8"/>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                <path d="m16 19 2 2 4-4"/>
              </svg>
            </div>
            
            <h1 className="text-3xl font-extrabold text-white tracking-tight mb-4">
              Check your inbox
            </h1>
            
            <p className="text-base text-zinc-400 mb-8 leading-relaxed">
              We've sent a secure recovery link to<br/>
              <strong className="text-emerald-400 font-semibold">{email}</strong>
            </p>

            <Button 
              className="w-full h-14 rounded-2xl bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all active:scale-95 text-base font-semibold shadow-lg backdrop-blur-md" 
              render={<Link href="/login" />}
            >
              Return to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md animate-fade-in relative group/form">
      {/* Background Liquid Mesh */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none transition-all duration-1000 group-focus-within/form:bg-indigo-600/30" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none transition-all duration-1000 group-focus-within/form:bg-fuchsia-600/30" />

      <div className="relative rounded-[2.5rem] bg-black/40 border border-white/10 backdrop-blur-3xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
        
        <div className="p-10 relative z-10">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-black text-white tracking-tight mb-3">Recover Account</h1>
            <p className="text-zinc-400 text-sm">
              Enter your email and we'll send you a magic link to reset your password.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2 relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-blue-400 transition-colors z-10">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              </div>
              <Input
                id="reset-email"
                type="email"
                placeholder="you@restaurant.com"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 pl-12 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-blue-500/50 focus-visible:bg-white/10 transition-all text-base shadow-inner relative z-0"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 rounded-2xl bg-white text-black hover:bg-zinc-200 transition-all active:scale-[0.98] text-base font-bold shadow-[0_0_30px_rgba(255,255,255,0.2)]" 
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-3">
                  <div className="h-5 w-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Sending Magic Link...
                </span>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-zinc-500">
              Remember your password?{" "}
              <Link
                href="/login"
                className="text-white hover:text-blue-400 font-bold transition-colors"
              >
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
