import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft, CheckCircle2, ChevronRight, Clock, ExternalLink, Loader2, Map as MapIcon, Shield, ShieldCheck,
  Siren, Timer, Users, XCircle,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { toast } from "sonner";
import { LiveMap } from "@/components/LiveMap";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — QuickHero" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

type Verification = {
  id: string; user_id: string; full_name: string; id_type: string; id_number: string;
  id_document_url: string | null; selfie_url: string | null; skills: string[] | null;
  notes: string | null; status: "pending" | "approved" | "rejected";
  reviewer_notes: string | null; created_at: string;
};
type Req = {
  id: string; requester_id: string; title: string; category: string;
  severity: string; status: string; created_at: string; updated_at: string;
  address: string | null; accepted_by: string | null; resolved_at: string | null;
};

function AdminPage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [verifs, setVerifs] = useState<Verification[]>([]);
  const [requests, setRequests] = useState<Req[]>([]);
  const [users, setUsers] = useState<{ id: string; full_name: string | null; email?: string | null; is_volunteer: boolean; is_verified: boolean }[]>([]);
  const [tab, setTab] = useState("live");
  const [selected, setSelected] = useState<Verification | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;
    const load = () => {
      supabase.from("volunteer_verifications").select("*").order("created_at", { ascending: false })
        .then(({ data }) => setVerifs((data as Verification[]) ?? []));
      supabase.from("help_requests").select("id,requester_id,title,category,severity,status,created_at,updated_at,address,accepted_by,resolved_at").order("created_at", { ascending: false }).limit(200)
        .then(({ data }) => setRequests((data as Req[]) ?? []));
      supabase.from("profiles").select("id,full_name,is_volunteer,is_verified").order("created_at", { ascending: false }).limit(100)
        .then(({ data }) => setUsers((data as never[]) ?? []));
    };
    load();
    const ch = supabase.channel("admin_verifs")
      .on("postgres_changes", { event: "*", schema: "public", table: "volunteer_verifications" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [isAdmin]);

  const signedUrl = async (path: string | null) => {
    if (!path) return null;
    if (urls[path]) return urls[path];
    const { data } = await supabase.storage.from("verifications").createSignedUrl(path, 300);
    if (data?.signedUrl) {
      setUrls((u) => ({ ...u, [path]: data.signedUrl }));
      return data.signedUrl;
    }
    return null;
  };

  useEffect(() => {
    if (!selected) return;
    void signedUrl(selected.id_document_url);
    void signedUrl(selected.selfie_url);
    setReviewerNotes(selected.reviewer_notes ?? "");
     
  }, [selected?.id]);

  const decide = async (status: "approved" | "rejected") => {
    if (!selected || !user) return;
    setBusy(true);
    const { error } = await supabase.from("volunteer_verifications").update({
      status, reviewer_id: user.id, reviewer_notes: reviewerNotes || null,
      reviewed_at: new Date().toISOString(),
    }).eq("id", selected.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Verification ${status}`);
    setSelected(null);
  };

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-40"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-lg pt-40 text-center">
          <Shield className="mx-auto h-12 w-12 text-subtext" />
          <h1 className="mt-4 text-2xl font-bold">Admins only</h1>
          <p className="mt-2 text-sm text-subtext">You don't have access to this area.</p>
          <Link to="/dashboard" className="mt-6 inline-block text-primary hover:underline">← Dashboard</Link>
        </div>
      </div>
    );
  }

  const pending = verifs.filter((v) => v.status === "pending");

  // Response-time stats (in minutes): created_at → first accept (accepted rows use updated_at as proxy)
  // and created_at → resolved_at for resolved rows.
  const acceptedTimes = requests
    .filter((r) => r.accepted_by && r.updated_at)
    .map((r) => (new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()) / 60000);
  const resolvedTimes = requests
    .filter((r) => r.status === "resolved" && r.resolved_at)
    .map((r) => (new Date(r.resolved_at as string).getTime() - new Date(r.created_at).getTime()) / 60000);
  const avg = (a: number[]) => a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : 0;
  const avgAcceptMin = avg(acceptedTimes);
  const avgResolveMin = avg(resolvedTimes);
  const fmtMin = (m: number) => m >= 60 ? `${Math.floor(m/60)}h ${m%60}m` : `${m}m`;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 pt-28 pb-20 sm:px-6">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-subtext hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded mb-4">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to dashboard
        </Link>
        <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-primary">
              <Shield className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold sm:text-3xl">Admin console</h1>
              <p className="text-sm text-subtext">Moderate verifications, requests, and community.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Stat icon={ShieldCheck} label="Pending verifications" value={pending.length} tone="bg-warning/10 text-warning" />
            <Stat icon={Siren} label="Active alerts" value={requests.filter((r) => ["open","accepted","in_progress"].includes(r.status)).length} tone="bg-danger/10 text-danger" />
            <Stat icon={Users} label="Members" value={users.length} tone="bg-primary/10 text-primary" />
            <StatText icon={Timer} label="Avg. accept time" value={acceptedTimes.length ? fmtMin(avgAcceptMin) : "—"} tone="bg-primary/10 text-primary" />
            <StatText icon={CheckCircle2} label="Avg. resolve time" value={resolvedTimes.length ? fmtMin(avgResolveMin) : "—"} tone="bg-success/10 text-success" />
          </div>

          <Tabs value={tab} onValueChange={setTab} className="mt-8">
            <TabsList className="rounded-full bg-muted p-1 flex-wrap h-auto">
              <TabsTrigger value="live" className="rounded-full"><MapIcon className="mr-1.5 h-3.5 w-3.5" />Live map</TabsTrigger>
              <TabsTrigger value="verifications" className="rounded-full">Verifications</TabsTrigger>
              <TabsTrigger value="requests" className="rounded-full">Requests</TabsTrigger>
              <TabsTrigger value="users" className="rounded-full">Members</TabsTrigger>
            </TabsList>

            <TabsContent value="live" className="mt-6">
              <LiveMap height={600} />
            </TabsContent>

            <TabsContent value="verifications" className="mt-6">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
                <div className="rounded-3xl border border-border bg-card shadow-soft divide-y divide-border overflow-hidden">
                  {verifs.length === 0 && <div className="p-8 text-center text-sm text-subtext">No verification submissions yet.</div>}
                  {verifs.map((v) => (
                    <button key={v.id} onClick={() => setSelected(v)}
                      className={`flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-muted/60 transition-colors ${selected?.id === v.id ? "bg-primary/5" : ""}`}>
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary">
                        {v.full_name.split(" ").map((s) => s[0]).slice(0,2).join("")}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{v.full_name}</div>
                        <div className="text-xs text-subtext">{v.id_type.replace("_"," ")} · {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}</div>
                      </div>
                      <Badge className={`capitalize ${
                        v.status === "approved" ? "bg-success text-success-foreground" :
                        v.status === "rejected" ? "bg-danger text-danger-foreground" :
                        "bg-warning text-warning-foreground"}`}>{v.status}</Badge>
                      <ChevronRight className="h-4 w-4 text-subtext" />
                    </button>
                  ))}
                </div>

                <div className="lg:sticky lg:top-24 lg:self-start">
                  {selected ? (
                    <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-4">
                      <div>
                        <h2 className="text-xl font-bold">{selected.full_name}</h2>
                        <p className="text-sm text-subtext">
                          {selected.id_type.replace("_"," ")} · {selected.id_number}
                        </p>
                      </div>
                      {selected.skills?.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {selected.skills.map((s) => <Badge key={s} variant="secondary" className="rounded-full">{s}</Badge>)}
                        </div>
                      ) : null}
                      {selected.notes && <p className="text-sm text-subtext"><b className="text-foreground">Notes:</b> {selected.notes}</p>}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <DocPreview label="ID document" url={selected.id_document_url ? urls[selected.id_document_url] : null} />
                        <DocPreview label="Selfie" url={selected.selfie_url ? urls[selected.selfie_url] : null} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-subtext">Reviewer note</label>
                        <Textarea rows={3} value={reviewerNotes} onChange={(e) => setReviewerNotes(e.target.value)}
                          placeholder="Optional message shown to the applicant" className="mt-1.5" />
                      </div>
                      <div className="flex gap-2">
                        <Button disabled={busy} onClick={() => decide("approved")}
                          className="flex-1 rounded-full bg-success text-success-foreground hover:opacity-90">
                          <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                        </Button>
                        <Button disabled={busy} onClick={() => decide("rejected")} variant="outline"
                          className="flex-1 rounded-full border-danger/40 text-danger hover:bg-danger/10">
                          <XCircle className="mr-2 h-4 w-4" /> Reject
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-subtext">
                      Pick a submission to review its ID and selfie.
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="requests" className="mt-6">
              <div className="rounded-3xl border border-border bg-card shadow-soft divide-y divide-border overflow-hidden">
                {requests.length === 0 && <div className="p-8 text-center text-sm text-subtext">No requests yet.</div>}
                {requests.map((r) => (
                  <Link key={r.id} to="/requests/$id" params={{ id: r.id }}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-muted/60 transition-colors">
                    <span className={`inline-flex h-2.5 w-2.5 rounded-full ${
                      r.severity === "critical" ? "bg-danger" : r.severity === "high" ? "bg-warning" : "bg-primary"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{r.title}</div>
                      <div className="text-xs text-subtext">
                        {r.category.replace("_"," ")} · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                      </div>
                    </div>
                    <Badge variant="secondary" className="capitalize">{r.status.replace("_"," ")}</Badge>
                    <ChevronRight className="h-4 w-4 text-subtext" />
                  </Link>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="users" className="mt-6">
              <div className="rounded-3xl border border-border bg-card shadow-soft divide-y divide-border overflow-hidden">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center gap-4 px-5 py-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary">
                      {(u.full_name ?? "?").split(" ").map((s) => s[0]).slice(0,2).join("").toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{u.full_name ?? "Unnamed"}</div>
                      <div className="text-xs text-subtext font-mono">{u.id.slice(0,8)}…</div>
                    </div>
                    {u.is_verified && <Badge className="bg-success text-success-foreground"><ShieldCheck className="mr-1 h-3 w-3" />Verified</Badge>}
                    {u.is_volunteer && <Badge variant="secondary">Volunteer</Badge>}
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: number; tone: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <div className="text-2xl font-extrabold">{value}</div>
          <div className="text-xs text-subtext">{label}</div>
        </div>
      </div>
    </div>
  );
}

function StatText({ icon: Icon, label, value, tone }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string; tone: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <div className="text-xl font-extrabold">{value}</div>
          <div className="text-xs text-subtext">{label}</div>
        </div>
      </div>
    </div>
  );
}

function DocPreview({ label, url }: { label: string; url: string | null | undefined }) {
  return (
    <div className="rounded-2xl border border-border overflow-hidden bg-muted/30">
      <div className="flex items-center justify-between px-3 py-2 text-xs">
        <span className="font-semibold">{label}</span>
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
            Open <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <div className="aspect-video bg-background/60 flex items-center justify-center">
        {url ? (
          <img src={url} alt={label} className="max-h-full max-w-full object-contain" />
        ) : (
          <Clock className="h-6 w-6 text-subtext" />
        )}
      </div>
    </div>
  );
}
