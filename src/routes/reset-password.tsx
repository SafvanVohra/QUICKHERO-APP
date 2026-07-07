import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Loader2, Lock, ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password — QuickHero" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

const schema = z.object({
  password: z.string().min(8, "At least 8 characters").max(72),
  confirm: z.string(),
}).refine((v) => v.password === v.confirm, {
  path: ["confirm"],
  message: "Passwords don't match",
});

function ResetPassword() {
  const navigate = useNavigate();
  const [done, setDone] = useState(false);

  // Read the reset code from the URL (?code=...)
  const code = new URLSearchParams(window.location.search).get("code") ?? "";

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ password }: z.infer<typeof schema>) => {
    if (!code) {
      toast.error("No reset code found", {
        description: "Open the 🔗 Reset link printed in the server console exactly as shown.",
      });
      return;
    }

    try {
      // Use the supabase resetPassword helper which calls POST /api/auth/reset-password
      const result = await supabase.auth.resetPassword(code, password);

      if (result.error) {
        toast.error("Reset failed", { description: result.error.message });
        return;
      }

      setDone(true);
      toast.success("Password updated! Redirecting to sign in…");
      setTimeout(() => navigate({ to: "/auth", replace: true }), 2000);
    } catch (e: any) {
      toast.error("Something went wrong", { description: e?.message ?? "Unknown error" });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background flex items-center justify-center py-12 px-4">
      <div className="pointer-events-none absolute inset-0 bg-hero" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-10 -left-20 h-96 w-96 rounded-full bg-primary/15 blur-3xl animate-blob" />
        <div className="absolute bottom-0 -right-20 h-96 w-96 rounded-full bg-accent/15 blur-3xl animate-blob [animation-delay:3s]" />
      </div>

      <div className="relative w-full max-w-md">
        <Link
          to="/auth"
          className="absolute -top-10 left-0 inline-flex items-center gap-1 rounded-full glass px-3 py-1.5 text-sm text-foreground shadow-soft hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.45 }}>

          {/* Logo / header */}
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-card shadow-primary ring-1 ring-primary/25">
                <span className="absolute inset-1 rounded-xl bg-gradient-primary opacity-20" />
                <Shield className="relative h-7 w-7 text-primary" strokeWidth={2.4} />
              </span>
              <span className="font-display text-3xl font-extrabold tracking-tight">
                Quick<span className="text-primary">Hero</span>
              </span>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight">Set a new password</h1>
            <p className="mt-1 text-sm text-subtext">
              {code ? "Choose a strong new password below." : "No reset code found — please request a new link."}
            </p>
          </div>

          <div className="rounded-3xl border border-border/80 bg-card/70 backdrop-blur-xl p-6 shadow-elevate">

            {!code ? (
              <div className="py-6 text-center space-y-4">
                <p className="text-sm text-danger font-semibold">
                  Reset code is missing from the URL.
                </p>
                <p className="text-xs text-muted-foreground">
                  Check your <strong>server/terminal console</strong> for the 🔗 Reset link and open it exactly as printed.
                </p>
                <Link to="/forgot-password">
                  <Button variant="hero" className="rounded-full mt-2">
                    Request a new reset link
                  </Button>
                </Link>
              </div>
            ) : done ? (
              <div className="py-8 text-center space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
                  <KeyRound className="h-7 w-7 text-success" />
                </div>
                <p className="font-bold text-foreground">Password updated!</p>
                <p className="text-sm text-subtext">Redirecting you to sign in…</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="rp-password" className="text-[10px] font-extrabold uppercase tracking-wider text-subtext">
                    New password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-subtext/60" />
                    <Input
                      id="rp-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      className="pl-10 h-11 rounded-xl"
                      {...register("password")}
                    />
                  </div>
                  {errors.password && (
                    <p className="text-xs text-danger">{errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="rp-confirm" className="text-[10px] font-extrabold uppercase tracking-wider text-subtext">
                    Confirm password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-subtext/60" />
                    <Input
                      id="rp-confirm"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Repeat your password"
                      className="pl-10 h-11 rounded-xl"
                      {...register("confirm")}
                    />
                  </div>
                  {errors.confirm && (
                    <p className="text-xs text-danger">{errors.confirm.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  variant="hero"
                  size="lg"
                  className="w-full rounded-full h-11 bg-gradient-primary shadow-primary"
                >
                  {isSubmitting
                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    : <KeyRound className="mr-2 h-4 w-4" />}
                  Update password
                </Button>
              </form>
            )}

          </div>
        </motion.div>
      </div>
    </div>
  );
}
