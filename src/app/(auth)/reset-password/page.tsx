"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    async function checkSession() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Invalid or expired password reset link.");
        router.push("/login");
      } else {
        setIsVerifying(false);
      }
    }
    checkSession();
  }, [router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      toast.success("Password updated successfully!");
      router.push("/overview");
    } catch {
      toast.error("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  }

  if (isVerifying) {
    return (
      <div className="w-full max-w-md animate-fade-in relative flex flex-col items-center justify-center p-12">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="relative">
            <div className="h-16 w-16 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-2xl flex items-center justify-center shadow-2xl relative z-10">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <div className="absolute inset-0 rounded-[2rem] border-2 border-indigo-500/50 border-t-transparent animate-spin" />
          </div>
          <p className="text-zinc-400 font-medium tracking-wide animate-pulse">Verifying secure link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700 relative group/form">
      {/* Background Liquid Mesh */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none transition-all duration-1000 group-focus-within/form:bg-blue-600/30" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-600/20 rounded-full blur-[100px] pointer-events-none transition-all duration-1000 group-focus-within/form:bg-purple-600/30" />

      <div className="relative rounded-[2.5rem] bg-black/40 border border-white/10 backdrop-blur-3xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
        
        <div className="p-10 relative z-10">
          <div className="text-center mb-10">
            <div className="mx-auto h-16 w-16 rounded-[1.5rem] bg-indigo-500/10 flex items-center justify-center border border-indigo-500/30 mb-6 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-3">Set New Password</h1>
            <p className="text-zinc-400 text-sm">
              Your identity has been verified. Please choose a strong password.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2 relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-indigo-400 transition-colors z-10">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/></svg>
              </div>
              <Input
                id="new-password"
                type="password"
                placeholder="New Password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 pl-12 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-indigo-500/50 focus-visible:bg-white/10 transition-all text-base shadow-inner relative z-0"
              />
            </div>

            <div className="space-y-2 relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-indigo-400 transition-colors z-10">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
              </div>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirm Password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-14 pl-12 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-indigo-500/50 focus-visible:bg-white/10 transition-all text-base shadow-inner relative z-0"
              />
            </div>

            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full h-14 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white transition-all active:scale-[0.98] text-base font-bold shadow-[0_0_30px_rgba(99,102,241,0.4)]" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-3">
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Updating...
                  </span>
                ) : (
                  "Save New Password"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
