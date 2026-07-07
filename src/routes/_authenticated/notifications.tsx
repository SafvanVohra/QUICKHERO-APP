import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — QuickHero" }, { name: "robots", content: "noindex" }] }),
  component: NotificationsPage,
});

type Notif = {
  id: string; type: string; title: string; body: string | null;
  link: string | null; read_at: string | null; created_at: string;
};

function NotificationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("notifications").select("*")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => { setItems((data as Notif[]) ?? []); setLoading(false); });
    const ch = supabase.channel(`notif_page_${user.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => {
          supabase.from("notifications").select("*")
            .eq("user_id", user.id).order("created_at", { ascending: false }).limit(200)
            .then(({ data }) => setItems((data as Notif[]) ?? []));
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const markAll = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id).is("read_at", null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 pt-28 pb-20 sm:px-6">
        <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-primary">
              <Bell className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold sm:text-3xl">Notifications</h1>
              <p className="text-sm text-subtext">Everything that needs your attention.</p>
            </div>
          </div>
          <Button variant="outline" onClick={markAll} className="rounded-full">
            <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
          </Button>
        </motion.div>

        <div className="mt-8 rounded-3xl border border-border bg-card shadow-soft divide-y divide-border overflow-hidden">
          {loading && <div className="p-10 text-center text-sm text-subtext">Loading…</div>}
          {!loading && items.length === 0 && (
            <div className="p-14 text-center">
              <Inbox className="mx-auto h-10 w-10 text-subtext" />
              <p className="mt-3 text-sm font-semibold">No notifications yet</p>
              <p className="text-xs text-subtext">You'll hear from us when a hero responds or your verification is reviewed.</p>
            </div>
          )}
          {items.map((n) => {
            const body = (
              <div className={`flex gap-4 p-5 hover:bg-muted/60 transition-colors ${!n.read_at ? "bg-primary/5" : ""}`}>
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.read_at ? "bg-border" : "bg-primary"}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{n.title}</div>
                  {n.body && <div className="mt-1 text-sm text-subtext">{n.body}</div>}
                  <div className="mt-2 text-[10px] uppercase tracking-wider text-subtext">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
            );
            return n.link
              ? <Link key={n.id} to={n.link} className="block">{body}</Link>
              : <div key={n.id}>{body}</div>;
          })}
        </div>
      </main>
    </div>
  );
}
