import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useId, useState, cloneElement, isValidElement, type ReactElement } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Mail, Lock, ShieldCheck, UserCheck, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in or join — QuickHero" },
      { name: "description", content: "Sign in to QuickHero or create your account to send emergency requests and respond to nearby help calls as a verified volunteer." },
      { property: "og:title", content: "Sign in or join QuickHero" },
      { property: "og:description", content: "Access your QuickHero account to send SOS alerts or respond to nearby community emergencies." },
      { property: "og:url", content: "https://quickhero.lovable.app/auth" },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://quickhero.lovable.app/auth" }],
  }),
  component: AuthPage,
});

const emailSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
});
const signUpSchema = emailSchema.extend({
  full_name: z.string().trim().min(2, "Enter your name").max(80),
});

async function routeAfterLogin(userId: string, navigate: ReturnType<typeof useNavigate>) {
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();
  const isNew = !data || !data.full_name || data.full_name.trim().length < 2;
  navigate({ to: isNew ? "/profile" : "/", replace: true });
  if (typeof window !== "undefined") window.scrollTo(0, 0);
}

function AuthPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      void routeAfterLogin(user.id, navigate);
    }
  }, [user, loading, navigate]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background flex items-center justify-center py-12 px-4">
      {/* Background Hero Blurs */}
      <div className="pointer-events-none absolute inset-0 bg-hero" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-10 -left-20 h-96 w-96 rounded-full bg-primary/15 blur-3xl animate-blob" />
        <div className="absolute bottom-0 -right-20 h-96 w-96 rounded-full bg-accent/15 blur-3xl animate-blob [animation-delay:3s]" />
      </div>

      <div className="relative w-full max-w-md flex flex-col items-center">
        {/* Floating Back Button */}
        <button
          onClick={() => router.navigate({ to: "/" })}
          className="absolute -top-12 left-0 inline-flex items-center gap-1.5 rounded-full glass px-4 py-1.5 text-xs font-bold text-foreground shadow-soft hover:bg-white/40 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
        </button>

        {/* Branding Logo - Matching Homepage */}
        <motion.div
          initial={{ y: -15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="mb-6 flex flex-col items-center"
        >
          <div className="flex items-center gap-3">
            <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-card shadow-primary ring-1 ring-primary/25">
              <span className="absolute inset-1 rounded-xl bg-gradient-danger opacity-15" />
              <img src="/favicon.png" alt="QuickHero logo" width={56} height={56} className="relative h-12 w-12 object-contain" />
            </span>
            <span className="font-display text-3xl font-extrabold tracking-tight">
              Quick<span className="text-primary">Hero</span>
            </span>
          </div>
          <p className="mt-2 text-xs font-semibold text-subtext uppercase tracking-widest">Community Rescue Network</p>
        </motion.div>

        {/* Pro Glassmorphic Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full rounded-3xl border border-border/80 bg-card/70 backdrop-blur-xl p-6 sm:p-8 shadow-elevate hover:border-border/100 transition-all duration-300 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-accent/5 pointer-events-none" />

          {/* Quick Demo logins */}
          <DemoAccounts />

          <Divider />

          {/* Regular Login Form Tabs */}
          <Tabs defaultValue="signin" className="mt-2">
            <TabsList className="grid w-full grid-cols-2 rounded-full bg-muted/80 p-1 border border-border/40">
              <TabsTrigger value="signin" className="rounded-full py-2 font-semibold text-xs capitalize">Sign in</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-full py-2 font-semibold text-xs capitalize">Sign up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="mt-5">
              <SignInForm />
            </TabsContent>
            <TabsContent value="signup" className="mt-5">
              <SignUpForm />
            </TabsContent>
          </Tabs>
        </motion.div>

        <p className="mt-6 text-center text-[10px] leading-relaxed text-subtext max-w-xs">
          By signing in, you agree to respond responsibly, never abuse the SOS system, and support your community.
        </p>
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div className="my-5 flex items-center gap-3 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/60">
      <span className="h-px flex-1 bg-border/60" /> Or continue with email <span className="h-px flex-1 bg-border/60" />
    </div>
  );
}

function DemoAccounts() {
  const [loadingRole, setLoadingRole] = useState<string | null>(null);

  const handleDemoLogin = async (email: string, roleName: string) => {
    setLoadingRole(roleName);
    const toastId = toast.loading(`Logging in as ${roleName}...`);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: "password123",
    });
    setLoadingRole(null);
    if (error) {
      toast.error("Demo login failed", { description: error.message, id: toastId });
    } else {
      toast.success(`Welcome back, ${roleName}!`, { id: toastId });
    }
  };

  return (
    <div className="space-y-3.5">
      <div className="text-center">
        <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-subtext/90">Quick Demo Access</h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">Click to instantly log in with pre-seeded demo accounts.</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Button
          onClick={() => handleDemoLogin("admin@quickhero.local", "Admin")}
          disabled={loadingRole !== null}
          variant="outline"
          className="flex flex-col items-center justify-center h-20 rounded-2xl border-danger/25 bg-danger/5 hover:bg-danger/10 hover:border-danger/40 transition-all gap-1.5 focus:ring-danger"
        >
          <ShieldCheck className="h-5 w-5 text-danger" />
          <span className="text-xs font-bold text-foreground">Admin</span>
          <span className="text-[9px] text-subtext leading-none font-medium">Aisha</span>
        </Button>
        <Button
          onClick={() => handleDemoLogin("volunteer@quickhero.local", "Volunteer")}
          disabled={loadingRole !== null}
          variant="outline"
          className="flex flex-col items-center justify-center h-20 rounded-2xl border-primary/25 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all gap-1.5 focus:ring-primary"
        >
          <HeartHandshake className="h-5 w-5 text-primary" />
          <span className="text-xs font-bold text-foreground">Volunteer</span>
          <span className="text-[9px] text-subtext leading-none font-medium">Vikram</span>
        </Button>
        <Button
          onClick={() => handleDemoLogin("user@quickhero.local", "User")}
          disabled={loadingRole !== null}
          variant="outline"
          className="flex flex-col items-center justify-center h-20 rounded-2xl border-success/25 bg-success/5 hover:bg-success/10 hover:border-success/40 transition-all gap-1.5 focus:ring-success"
        >
          <UserCheck className="h-5 w-5 text-success" />
          <span className="text-xs font-bold text-foreground">Member</span>
          <span className="text-[9px] text-subtext leading-none font-medium">Riya</span>
        </Button>
      </div>
    </div>
  );
}

function SignInForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(emailSchema),
  });
  const onSubmit = async (values: z.infer<typeof emailSchema>) => {
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      toast.error("Sign in failed", { description: error.message });
      return;
    }
    toast.success("Welcome back!");
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Email" error={errors.email?.message}>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-subtext/60" />
          <Input type="email" placeholder="you@example.com" autoComplete="off" className="pl-10 h-11 rounded-xl border-border/80 focus-visible:ring-primary/25" {...register("email")} />
        </div>
      </Field>
      <Field label="Password" error={errors.password?.message}>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-subtext/60" />
          <Input type="password" placeholder="••••••••" autoComplete="current-password" className="pl-10 h-11 rounded-xl border-border/80 focus-visible:ring-primary/25" {...register("password")} />
        </div>
      </Field>
      <div className="flex justify-end -mt-2">
        <Link to="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" disabled={isSubmitting} variant="hero" size="lg" className="w-full rounded-full h-11 bg-gradient-primary shadow-primary">
        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Sign in
      </Button>
    </form>
  );
}

function SignUpForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(signUpSchema),
  });
  const onSubmit = async (values: z.infer<typeof signUpSchema>) => {
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/profile`,
        data: { full_name: values.full_name },
      },
    });
    if (error) {
      toast.error("Sign up failed", { description: error.message });
      return;
    }
    toast.success("Account created!", { description: "Welcome to QuickHero." });
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Full name" error={errors.full_name?.message}>
        <div className="relative">
          <UserCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-subtext/60" />
          <Input placeholder="Your name" autoComplete="name" className="pl-10 h-11 rounded-xl border-border/80 focus-visible:ring-primary/25" {...register("full_name")} />
        </div>
      </Field>
      <Field label="Email" error={errors.email?.message}>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-subtext/60" />
          <Input type="email" placeholder="you@example.com" autoComplete="email" className="pl-10 h-11 rounded-xl border-border/80 focus-visible:ring-primary/25" {...register("email")} />
        </div>
      </Field>
      <Field label="Password" error={errors.password?.message}>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-subtext/60" />
          <Input type="password" placeholder="At least 8 characters" autoComplete="new-password" className="pl-10 h-11 rounded-xl border-border/80 focus-visible:ring-primary/25" {...register("password")} />
        </div>
      </Field>
      <Button type="submit" disabled={isSubmitting} variant="hero" size="lg" className="w-full rounded-full h-11 bg-gradient-primary shadow-primary">
        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Create account
      </Button>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  const id = useId();
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<{ id?: string }>, { id })
    : children;
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-[10px] font-extrabold uppercase tracking-wider text-subtext">{label}</Label>
      {control}
      {error && <p className="text-[11px] font-medium text-danger">{error}</p>}
    </div>
  );
}
