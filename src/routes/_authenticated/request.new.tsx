import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Activity, AlertTriangle, ArrowLeft, Baby, Bike, Cross, Droplet, Flame,
  Loader2, MapPin, PawPrint, PersonStanding, Search, ShieldCheck, Siren,
  Sparkles, Utensils, Waves,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentPosition, type Coords } from "@/lib/geolocation";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/request/new")({
  head: () => ({
    meta: [
      { title: "New Emergency Request — QuickHero" },
      { name: "description", content: "Create a new emergency help request and alert verified volunteers near your location instantly." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewRequest,
});

const categories = [
  { key: "medical", label: "Medical", icon: Cross, tone: "bg-danger/10 text-danger" },
  { key: "accident", label: "Accident", icon: AlertTriangle, tone: "bg-warning/10 text-warning" },
  { key: "fire", label: "Fire", icon: Flame, tone: "bg-danger/10 text-danger" },
  { key: "blood", label: "Blood", icon: Droplet, tone: "bg-danger/10 text-danger" },
  { key: "women_safety", label: "Women Safety", icon: ShieldCheck, tone: "bg-primary/10 text-primary" },
  { key: "vehicle", label: "Vehicle", icon: Bike, tone: "bg-secondary/10 text-secondary" },
  { key: "food", label: "Food", icon: Utensils, tone: "bg-accent/10 text-accent" },
  { key: "flood", label: "Flood", icon: Waves, tone: "bg-secondary/10 text-secondary" },
  { key: "earthquake", label: "Earthquake", icon: Activity, tone: "bg-warning/10 text-warning" },
  { key: "lost_person", label: "Lost Person", icon: Search, tone: "bg-primary/10 text-primary" },
  { key: "animal", label: "Animal", icon: PawPrint, tone: "bg-accent/10 text-accent" },
  { key: "senior", label: "Senior", icon: PersonStanding, tone: "bg-primary/10 text-primary" },
  { key: "pregnancy", label: "Pregnancy", icon: Baby, tone: "bg-danger/10 text-danger" },
  { key: "other", label: "Other", icon: Sparkles, tone: "bg-muted text-foreground" },
];

const severities = [
  { key: "low", label: "Low" },
  { key: "medium", label: "Medium" },
  { key: "high", label: "High" },
  { key: "critical", label: "Critical" },
] as const;

function NewRequest() {
  const router = useRouter();
  const [category, setCategory] = useState<string>("medical");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<(typeof severities)[number]["key"]>("high");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const grabLocation = async () => {
    setLocating(true);
    try {
      const c = await getCurrentPosition();
      setCoords(c);
      toast.success("Live location captured");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLocating(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Add a short title");
    let c = coords;
    if (!c) {
      try {
        c = await getCurrentPosition();
        setCoords(c);
      } catch {
        return toast.error("Location required — enable and retry");
      }
    }
    setSubmitting(true);
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) { setSubmitting(false); return toast.error("Please sign in again"); }
    const { data, error } = await supabase
      .from("help_requests")
      .insert({
        requester_id: uid,
        category, title: title.trim(), description: description.trim() || null,
        severity, lat: c.lat, lng: c.lng, address: address.trim() || null,
      })
      .select("id")
      .single();
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Alert sent — heroes are being notified");
    router.navigate({ to: "/requests/$id", params: { id: data.id } });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 pt-28 pb-20 sm:px-6">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-medium text-subtext hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
        <motion.div
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="mt-4"
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-danger shadow-danger">
              <Siren className="h-5 w-5 text-danger-foreground" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold sm:text-3xl">New emergency alert</h1>
              <p className="text-sm text-subtext">Fill it fast — every second counts.</p>
            </div>
          </div>

          <form onSubmit={submit} className="mt-8 space-y-6 rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
            <div>
              <Label className="text-sm font-semibold">Category</Label>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {categories.map((c) => {
                  const active = category === c.key;
                  return (
                    <button
                      type="button" key={c.key} onClick={() => setCategory(c.key)}
                      className={`flex flex-col items-center gap-2 rounded-2xl border p-3 text-xs font-semibold transition-all ${
                        active ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${c.tone}`}>
                        <c.icon className="h-4 w-4" />
                      </span>
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label htmlFor="title" className="text-sm font-semibold">Short title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Chest pain, need urgent help" className="mt-2 h-12" required />
            </div>

            <div>
              <Label htmlFor="desc" className="text-sm font-semibold">Details (optional)</Label>
              <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)}
                rows={4} placeholder="Landmarks, condition, what help you need…" className="mt-2" />
            </div>

            <div>
              <Label className="text-sm font-semibold">Severity</Label>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {severities.map((s) => {
                  const active = severity === s.key;
                  return (
                    <button
                      key={s.key} type="button" onClick={() => setSeverity(s.key)}
                      className={`rounded-xl border py-2.5 text-sm font-semibold capitalize transition-all ${
                        active
                          ? s.key === "critical" ? "border-danger bg-danger text-danger-foreground" :
                            s.key === "high" ? "border-warning bg-warning text-warning-foreground" :
                            "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label htmlFor="addr" className="text-sm font-semibold">Address (optional)</Label>
              <Input id="addr" value={address} onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, area, landmark" className="mt-2 h-12" />
            </div>

            <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <MapPin className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold">Live location</div>
                    <div className="text-xs text-subtext">
                      {coords
                        ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                        : "Required so heroes can find you"}
                    </div>
                  </div>
                </div>
                <Button type="button" variant="outline" onClick={grabLocation} disabled={locating} className="rounded-full">
                  {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : coords ? "Refresh" : "Get location"}
                </Button>
              </div>
            </div>

            <Button type="submit" disabled={submitting} size="lg"
              className="w-full rounded-full bg-gradient-danger text-danger-foreground shadow-danger hover:opacity-95">
              {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Siren className="mr-2 h-5 w-5" />}
              Send emergency alert
            </Button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
