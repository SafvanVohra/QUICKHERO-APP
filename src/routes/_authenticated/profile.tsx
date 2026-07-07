import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { z } from "zod";
import {
  Award, Camera, Heart, Loader2, MapPin, Phone, Save, Shield, ShieldCheck, User,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Navbar } from "@/components/Navbar";
import { EmergencyFab } from "@/components/EmergencyFab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — QuickHero" },
      { name: "description", content: "Complete your QuickHero profile to send and answer help requests." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your name").max(80),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  gender: z.string().max(20).optional().or(z.literal("")),
  blood_group: z.string().max(5).optional().or(z.literal("")),
  age: z.coerce.number().int().min(0).max(120).optional().or(z.nan()),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  emergency_contact: z.string().trim().max(50).optional().or(z.literal("")),
  bio: z.string().trim().max(500).optional().or(z.literal("")),
  skills: z.string().trim().max(200).optional().or(z.literal("")),
  languages: z.string().trim().max(200).optional().or(z.literal("")),
  is_volunteer: z.boolean().default(false),
  is_available: z.boolean().default(false),
});
type ProfileForm = z.infer<typeof profileSchema>;

function ProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema) as never,
    defaultValues: {
      full_name: "", phone: "", gender: "", blood_group: "", age: undefined,
      address: "", emergency_contact: "", bio: "", skills: "", languages: "",
      is_volunteer: false, is_available: false,
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        full_name: profile.full_name ?? "",
        phone: profile.phone ?? "",
        gender: profile.gender ?? "",
        blood_group: profile.blood_group ?? "",
        age: profile.age ?? undefined,
        address: profile.address ?? "",
        emergency_contact: profile.emergency_contact ?? "",
        bio: profile.bio ?? "",
        skills: (profile.skills ?? []).join(", "),
        languages: (profile.languages ?? []).join(", "),
        is_volunteer: profile.is_volunteer ?? false,
        is_available: profile.is_available ?? false,
      });
    }
  }, [profile, form]);

  const save = useMutation({
    mutationFn: async (values: ProfileForm) => {
      const payload = {
        id: user!.id,
        full_name: values.full_name,
        phone: values.phone || null,
        gender: values.gender || null,
        blood_group: values.blood_group || null,
        age: Number.isFinite(values.age) ? values.age : null,
        address: values.address || null,
        emergency_contact: values.emergency_contact || null,
        bio: values.bio || null,
        skills: values.skills ? values.skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
        languages: values.languages ? values.languages.split(",").map((s) => s.trim()).filter(Boolean) : [],
        is_volunteer: values.is_volunteer,
        is_available: values.is_available,
      };
      const { error } = await supabase.from("profiles").upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      const wasNew = !profile || !profile.full_name || profile.full_name.trim().length < 2;
      toast.success(wasNew ? "Welcome to QuickHero!" : "Profile saved");
      qc.invalidateQueries({ queryKey: ["profile"] });
      if (wasNew) {
        navigate({ to: "/", replace: true });
        if (typeof window !== "undefined") window.scrollTo(0, 0);
      }
    },
    onError: (e: Error) => toast.error("Save failed", { description: e.message }),
  });

  const initials = (profile?.full_name ?? user?.email ?? "?")
    .split(/\s+/).map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-28 pb-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          {/* Header card */}
          <motion.div
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="relative overflow-hidden rounded-4xl bg-gradient-primary p-6 shadow-primary sm:p-10"
          >
            <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-card text-2xl font-bold text-foreground shadow-elevate">
                    {initials}
                  </div>
                  <button className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-card text-foreground shadow-soft hover:bg-muted" aria-label="Change photo">
                    <Camera className="h-4 w-4" />
                  </button>
                </div>
                <div className="text-primary-foreground">
                  <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                    {profile?.full_name || "Your profile"}
                  </h1>
                  <p className="text-sm text-primary-foreground/85">{user?.email}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge className="rounded-full bg-white/20 text-primary-foreground hover:bg-white/25">
                      {profile?.is_volunteer ? <Heart className="mr-1 h-3 w-3" /> : <User className="mr-1 h-3 w-3" />}
                      {profile?.is_volunteer ? "Volunteer" : "Member"}
                    </Badge>
                    {profile?.is_verified ? (
                      <Badge className="rounded-full bg-success text-success-foreground">
                        <ShieldCheck className="mr-1 h-3 w-3" /> Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="rounded-full border-white/40 text-primary-foreground">
                        <Shield className="mr-1 h-3 w-3" /> Verification pending
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {isLoading ? (
            <div className="mt-8 grid gap-6 lg:grid-cols-3">
              <Skeleton className="h-64 rounded-3xl lg:col-span-2" />
              <Skeleton className="h-64 rounded-3xl" />
            </div>
          ) : (
            <form
              onSubmit={form.handleSubmit((v) => save.mutate(v))}
              className="mt-8 grid gap-6 lg:grid-cols-3"
            >
              <Card className="lg:col-span-2" title="Personal details" icon={User}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name" error={form.formState.errors.full_name?.message}>
                    <Input {...form.register("full_name")} placeholder="Your name" />
                  </Field>
                  <Field label="Phone">
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtext" />
                      <Input {...form.register("phone")} className="pl-9" placeholder="+91 90000 00000" />
                    </div>
                  </Field>
                  <Field label="Gender">
                    <Select
                      value={form.watch("gender") || ""}
                      onValueChange={(v) => form.setValue("gender", v, { shouldDirty: true })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {["Female", "Male", "Non-binary", "Prefer not to say"].map((g) => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Age">
                    <Input type="number" min={0} max={120} {...form.register("age")} placeholder="30" />
                  </Field>
                  <Field label="Blood group">
                    <Select
                      value={form.watch("blood_group") || ""}
                      onValueChange={(v) => form.setValue("blood_group", v, { shouldDirty: true })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((b) => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Emergency contact">
                    <Input {...form.register("emergency_contact")} placeholder="Name & phone" />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Address">
                      <div className="relative">
                        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtext" />
                        <Input {...form.register("address")} className="pl-9" placeholder="Street, area, city" />
                      </div>
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="Skills (comma-separated)">
                      <Input {...form.register("skills")} placeholder="First aid, CPR, driving" />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="Languages">
                      <Input {...form.register("languages")} placeholder="English, Hindi, Kannada" />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="Bio">
                      <Textarea rows={3} {...form.register("bio")} placeholder="A short intro about you." />
                    </Field>
                  </div>
                </div>
              </Card>

              <div className="space-y-6">
                <Card title="Volunteer" icon={Heart}>
                  <Toggle
                    label="I want to be a volunteer"
                    description="Get notified about nearby emergency requests."
                    checked={!!form.watch("is_volunteer")}
                    onChange={(v) => form.setValue("is_volunteer", v, { shouldDirty: true })}
                  />
                  <div className="mt-3">
                    <Toggle
                      label="Available right now"
                      description="Toggle off when you can't respond."
                      checked={!!form.watch("is_available")}
                      onChange={(v) => form.setValue("is_available", v, { shouldDirty: true })}
                      disabled={!form.watch("is_volunteer")}
                    />
                  </div>
                </Card>

                <Card title="Verification" icon={Award}>
                  <p className="text-sm text-subtext">
                    Upload your government ID to earn the Verified badge and unlock high-priority requests.
                  </p>
                  <a href="/verify" className="block">
                    <Button type="button" variant="outline" className="mt-4 w-full rounded-full border-primary/40 text-primary hover:bg-primary/5">
                      <ShieldCheck className="mr-2 h-4 w-4" /> {profile?.is_verified ? "View status" : "Get verified"}
                    </Button>
                  </a>
                </Card>
              </div>

              <div className="lg:col-span-3 flex justify-end">
                <Button
                  type="submit"
                  disabled={save.isPending}
                  className="rounded-full bg-gradient-primary shadow-primary px-8 h-11 font-semibold"
                >
                  {save.isPending
                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    : <Save className="mr-2 h-4 w-4" />}
                  Save changes
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
      <EmergencyFab />
    </div>
  );
}

function Card({
  title, icon: Icon, children, className = "",
}: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; className?: string }) {
  return (
    <motion.section
      initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }}
      className={`rounded-3xl bg-card p-6 shadow-soft ${className}`}
    >
      <div className="mb-5 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      {children}
    </motion.section>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-subtext">{label}</Label>
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

function Toggle({
  label, description, checked, onChange, disabled,
}: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className={`flex items-start justify-between gap-4 rounded-2xl border border-border p-4 ${disabled ? "opacity-60" : ""}`}>
      <div>
        <div className="text-sm font-semibold">{label}</div>
        {description && <p className="text-xs text-subtext">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}
