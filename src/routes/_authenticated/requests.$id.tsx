import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft, CheckCircle2, Clock, Loader2, MapPin, Send, Shield, Siren, XCircle,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { RealMap } from "@/components/RealMap";
import { RequestStepper } from "@/components/RequestStepper";
import { NearbyVolunteers } from "@/components/NearbyVolunteers";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/requests/$id")({
  component: RequestDetail,
});

type Req = {
  id: string; requester_id: string; category: string; title: string;
  description: string | null; severity: string; status: string;
  lat: number; lng: number; address: string | null;
  accepted_by: string | null; resolved_at: string | null; created_at: string;
};
type Msg = { id: string; sender_id: string; content: string; created_at: string };
type Profile = { id: string; full_name: string | null; photo_url: string | null; is_verified: boolean | null };

function RequestDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [req, setReq] = useState<Req | null>(null);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cancelOpen, setCancelOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isRequester = !!user && req?.requester_id === user.id;
  const isResponder = !!user && req?.accepted_by === user.id;
  const canChat = isRequester || isResponder;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("help_requests").select("*").eq("id", id).maybeSingle();
      if (!cancelled) { setReq(data as Req | null); setLoading(false); }
    })();
    const ch = supabase
      .channel(`req_${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "help_requests", filter: `id=eq.${id}` }, (p) => {
        if (p.eventType === "DELETE") { setReq(null); return; }
        setReq(p.new as Req);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `request_id=eq.${id}` }, (p) => {
        setMsgs((m) => [...m, p.new as Msg]);
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [id]);

  // Load chat + profiles when access is established
  useEffect(() => {
    if (!canChat) return;
    supabase.from("chat_messages").select("*").eq("request_id", id).order("created_at").then(({ data }) => {
      if (data) setMsgs(data as Msg[]);
    });
  }, [canChat, id]);

  useEffect(() => {
    if (!req) return;
    const ids = Array.from(new Set([req.requester_id, req.accepted_by].filter(Boolean))) as string[];
    if (!ids.length) return;
    supabase.from("public_profiles").select("id,full_name,photo_url,is_verified").in("id", ids).then(({ data }) => {
      if (data) setProfiles(Object.fromEntries(data.map((p) => [p.id, p as Profile])));
    });
  }, [req?.requester_id, req?.accepted_by]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length]);

  const accept = async () => {
    if (!user || !req) return;
    setBusy(true);
    const { data, error } = await supabase.from("help_requests")
      .update({ accepted_by: user.id, status: "accepted" })
      .eq("id", req.id)
      .eq("status", "open")
      .is("accepted_by", null)
      .select()
      .maybeSingle();
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
    if (!data) {
      const { data: fresh } = await supabase.from("help_requests").select("*").eq("id", req.id).maybeSingle();
      if (fresh) setReq(fresh as Req);
      setBusy(false);
      toast.error("This alert is already accepted by another helper.");
      return;
    }

    const acceptedReq = data as Req;
    setReq(acceptedReq);
    await supabase.from("request_responses").upsert({ request_id: req.id, volunteer_id: user.id, status: "accepted" });
    const { data: mData } = await supabase.from("chat_messages").select("*").eq("request_id", req.id).order("created_at");
    if (mData) setMsgs(mData as Msg[]);
    setBusy(false);
    toast.success("You accepted this alert. Chat is open now.");
  };

  const setStatus = async (status: "accepted" | "in_progress" | "resolved" | "cancelled") => {
    if (!req) return;
    setBusy(true);
    const patch: { status: typeof status; resolved_at?: string } = { status };
    if (status === "resolved") patch.resolved_at = new Date().toISOString();
    const { error } = await supabase.from("help_requests").update(patch).eq("id", req.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Marked ${status.replace("_", " ")}`);
  };

  const confirmCancel = async () => {
    if (!req) return;
    setCancelOpen(false);
    setBusy(true);
    const { error } = await supabase.from("help_requests").update({ status: "cancelled" }).eq("id", req.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Alert cancelled");
    router.navigate({ to: "/dashboard" });
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user || !req) return;
    const content = input.trim();
    setInput("");
    const { error } = await supabase.from("chat_messages").insert({
      request_id: req.id, sender_id: user.id, content,
    });
    if (error) { toast.error(error.message); setInput(content); }
  };

  const requesterName = useMemo(() => req && (profiles[req.requester_id]?.full_name ?? "Requester"), [req, profiles]);
  const responderName = useMemo(() => req?.accepted_by && (profiles[req.accepted_by]?.full_name ?? "Volunteer"), [req, profiles]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-40"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      </div>
    );
  }
  if (!req) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-lg pt-40 text-center">
          <h1 className="text-2xl font-bold">Request not found</h1>
          <Link to="/dashboard" className="mt-4 inline-block text-primary hover:underline">← Back to dashboard</Link>
        </div>
      </div>
    );
  }

  const severityColor =
    req.severity === "critical" ? "bg-danger text-danger-foreground" :
    req.severity === "high" ? "bg-warning text-warning-foreground" :
    "bg-primary text-primary-foreground";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 pt-28 pb-40 sm:px-6 sm:pb-20">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-subtext hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
        </Link>

        <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-6">
          {/* Left: Detail + chat */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-border bg-card p-4 shadow-elevate sm:p-8">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 sm:flex sm:flex-wrap sm:items-center">
                <Badge className={`capitalize ${severityColor}`}>{req.severity}</Badge>
                <Badge variant="secondary" className="capitalize">{req.status.replace("_", " ")}</Badge>
                <Badge variant="outline" className="capitalize">{req.category.replace("_", " ")}</Badge>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs text-subtext sm:ml-auto">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />{formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                </span>
              </div>
              <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">{req.title}</h1>
              {req.description && <p className="mt-3 text-subtext leading-relaxed">{req.description}</p>}

              {/* Live stepper */}
              <div className="mt-5">
                <RequestStepper status={req.status as "open" | "accepted" | "in_progress" | "resolved" | "cancelled"} />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-subtext">
                <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" aria-hidden="true" />
                  {req.address ?? `${req.lat.toFixed(4)}, ${req.lng.toFixed(4)}`}</span>
                <span className="inline-flex items-center gap-1.5">
                  <Shield className="h-4 w-4" aria-hidden="true" />Requester:{" "}
                  <b className="text-foreground inline-flex items-center gap-1">
                    {requesterName}
                    <VerifiedBadge verified={req && profiles[req.requester_id]?.is_verified} size="xs" />
                  </b>
                </span>
                {responderName && (
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                    Responder:{" "}
                    <b className="text-foreground inline-flex items-center gap-1">
                      {responderName}
                      <VerifiedBadge verified={req?.accepted_by ? profiles[req.accepted_by]?.is_verified : false} size="xs" />
                    </b>
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="mt-6 hidden gap-2 lg:flex lg:flex-wrap">
                {!isRequester && !req.accepted_by && req.status === "open" && (
                  <Button disabled={busy} onClick={accept}
                    variant="danger"
                    className="h-12 rounded-full text-base shadow-danger">
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Siren className="mr-2 h-5 w-5" strokeWidth={3} />}
                    Accept & help
                  </Button>
                )}
                {(isRequester || isResponder) && req.status !== "resolved" && req.status !== "cancelled" && (
                  <>
                    {isResponder && req.status === "accepted" && (
                      <Button disabled={busy} onClick={() => setStatus("in_progress")} variant="outline" className="rounded-full">
                        Mark in progress
                      </Button>
                    )}
                    {isRequester && (
                      <Button disabled={busy} onClick={() => setStatus("resolved")}
                        variant="success" className="rounded-full">
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Mark resolved
                      </Button>
                    )}
                  </>
                )}
                {isRequester && req.status !== "resolved" && req.status !== "cancelled" && (
                  <Button disabled={busy} onClick={() => setCancelOpen(true)} variant="ghost" className="rounded-full text-danger hover:bg-danger/10">
                    <XCircle className="mr-2 h-4 w-4" /> Cancel alert
                  </Button>
                )}
              </div>
            </div>

            {/* Chat */}
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-elevate">
              <div className="border-b border-border px-6 py-4">
                <h2 className="font-bold">Live rescue chat</h2>
                <p className="text-xs text-subtext">
                  {canChat ? "Chat is open for the requester and accepted helper." : "Accept this alert to unlock chat."}
                </p>
              </div>
              <div ref={scrollRef} className="max-h-96 min-h-60 overflow-y-auto p-4 space-y-2">
                <AnimatePresence initial={false}>
                  {canChat && msgs.length === 0 && (
                    <p className="pt-6 text-center text-sm text-subtext">No messages yet — say hi.</p>
                  )}
                  {msgs.map((m) => {
                    const mine = m.sender_id === user?.id;
                    return (
                      <motion.div key={m.id}
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-soft ${
                          mine ? "bg-gradient-primary text-primary-foreground" : "bg-muted text-foreground"
                        }`}>
                          {m.content}
                          <div className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-subtext"}`}>
                            {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
              <form onSubmit={send} className="flex items-center gap-2 border-t border-border p-3" aria-label="Send chat message">
                <label htmlFor="chat-input" className="sr-only">Message</label>
                <Input id="chat-input" value={input} onChange={(e) => setInput(e.target.value)}
                  placeholder={canChat ? "Type a message…" : "Chat locked"}
                  disabled={!canChat} className="h-11 rounded-full" />
                <Button type="submit" disabled={!canChat || !input.trim()}
                  aria-label="Send message"
                  className="h-11 w-11 rounded-full bg-gradient-primary shadow-primary p-0">
                  <Send className="h-4 w-4" aria-hidden="true" />
                </Button>
              </form>
            </div>
          </div>

          {/* Right: Map + nearby volunteers */}
          <div className="lg:sticky lg:top-24 lg:self-start space-y-4">
            <RealMap
              markers={[{ id: req.id, lat: req.lat, lng: req.lng, label: req.category, tone: severityColor.split(" ")[0], pulse: true }]}
              center={{ lat: req.lat, lng: req.lng }}
              height={340}
              radiusKm={5}
              directionsTo={{ lat: req.lat, lng: req.lng }}
            />
            <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
              <h3 className="font-bold">Get there fast</h3>
              <p className="mt-2 text-sm text-subtext">
                {req.address ?? "No address provided."}
              </p>
              <p className="mt-1 text-xs text-subtext">
                {req.lat.toFixed(5)}, {req.lng.toFixed(5)}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {(["driving", "walking", "transit"] as const).map((mode) => {
                  const url = `https://www.google.com/maps/dir/?api=1&destination=${req.lat},${req.lng}&travelmode=${mode}`;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        const w = window.open(url, "_blank", "noopener,noreferrer");
                        if (!w) window.location.href = url;
                      }}
                      aria-label={`Get ${mode} directions`}
                      className="rounded-full border border-border bg-background/60 px-3 py-2 text-center text-xs font-semibold capitalize text-foreground shadow-soft transition-transform hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {mode}
                    </button>
                  );
                })}
              </div>
            </div>
            <NearbyVolunteers lat={req.lat} lng={req.lng} radiusKm={10} />
          </div>
        </motion.div>
      </main>

      {/* Sticky mobile action bar */}
      {req.status !== "resolved" && req.status !== "cancelled" && (
        <div
          role="toolbar"
          aria-label="Request actions"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 p-3 shadow-elevate backdrop-blur-xl lg:hidden"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
        >
          <div className="mx-auto flex max-w-md gap-2">
            {!isRequester && !req.accepted_by && req.status === "open" && (
              <Button disabled={busy} onClick={accept} variant="danger"
                className="h-12 flex-1 rounded-full text-base shadow-danger">
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Siren className="mr-2 h-5 w-5" strokeWidth={3} aria-hidden="true" />}
                Accept & help
              </Button>
            )}
            {(isRequester || isResponder) && (
              <>
                {isResponder && req.status === "accepted" && (
                  <Button disabled={busy} onClick={() => setStatus("in_progress")} variant="outline" className="h-12 flex-1 rounded-full">
                    On the way
                  </Button>
                )}
                {isRequester && (
                  <Button disabled={busy} onClick={() => setStatus("resolved")} variant="success" className="h-12 flex-1 rounded-full">
                    <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" /> Resolved
                  </Button>
                )}
              </>
            )}
            {isRequester && (
              <Button disabled={busy} onClick={() => setCancelOpen(true)} variant="ghost" aria-label="Cancel alert"
                className="h-12 w-12 shrink-0 rounded-full text-danger hover:bg-danger/10">
                <XCircle className="h-5 w-5" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Cancel confirmation dialog */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this alert?</AlertDialogTitle>
            <AlertDialogDescription>
              Volunteers who accepted will be notified that help is no longer needed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep active</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              className="bg-danger text-danger-foreground hover:bg-danger/90"
            >
              Yes, cancel alert
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
