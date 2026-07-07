import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Mail, MailCheck, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Forgot your password — QuickHero" },
      { name: "description", content: "Reset your QuickHero password. Enter your email and we'll send you a secure link to choose a new password and get back to helping your community." },
      { property: "og:title", content: "Reset your QuickHero password" },
      { property: "og:description", content: "Request a secure password reset link for your QuickHero account." },
      { property: "og:url", content: "https://quickhero.lovable.app/forgot-password" },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://quickhero.lovable.app/forgot-password" }],
  }),
  component: ForgotPassword,
});


const schema = z.object({ email: z.string().trim().email("Enter a valid email").max(255) });

function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting }, getValues } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ email }: { email: string }) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error("Couldn't send reset email", { description: error.message });
      return;
    }
    setSent(true);
    toast.success("Reset link sent — check your inbox.");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-hero" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-10 -left-20 h-96 w-96 rounded-full bg-primary/20 blur-3xl animate-blob" />
        <div className="absolute bottom-0 -right-20 h-96 w-96 rounded-full bg-accent/20 blur-3xl animate-blob [animation-delay:3s]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-12">
        <Link
          to="/auth"
          className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full glass px-3 py-1.5 text-sm text-foreground shadow-soft hover:bg-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>

        <motion.div
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-primary shadow-primary">
              <Shield className="h-7 w-7 text-primary-foreground" strokeWidth={2.4} />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Reset your password</h1>
            <p className="mt-1 text-sm text-subtext">We'll email you a secure reset link.</p>
          </div>

          <div className="rounded-3xl bg-card p-6 shadow-elevate">
            {sent ? (
              <div className="text-center py-6">
                <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
                  <MailCheck className="h-7 w-7" />
                </div>
                <h2 className="text-lg font-bold">Check your email</h2>
                <p className="mt-2 text-sm text-subtext">
                  If an account exists for <b className="text-foreground">{getValues("email")}</b>, we've sent password reset instructions.
                </p>
                <Link to="/auth" className="mt-6 inline-block">
                  <Button variant="outline" className="rounded-full">Back to sign in</Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fp-email" className="text-xs font-semibold uppercase tracking-wider text-subtext">Email</Label>
                  <Input id="fp-email" type="email" placeholder="you@example.com" autoComplete="email" {...register("email")} />
                  {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
                </div>
                <Button type="submit" disabled={isSubmitting} variant="hero" size="lg" className="w-full rounded-full">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                  Send reset link
                </Button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
