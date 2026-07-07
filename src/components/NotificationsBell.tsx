import { useEffect, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { Bell, CheckCheck, Siren } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type Notif = {
  id: string; type: string; title: string; body: string | null;
  link: string | null; read_at: string | null; created_at: string;
};

export function NotificationsBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Notif[]>([]);
  const unread = items.filter((n) => !n.read_at).length;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase.from("notifications").select("*")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(25)
      .then(({ data }) => { if (!cancelled && data) setItems(data as Notif[]); });
    const ch = supabase
      .channel(`notifs_${user.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (p) => {
          const n = p.new as Notif;
          setItems((prev) => [n, ...prev]);
          const urgent = n.type === "urgent_nearby" || n.type === "nearby_alert";
          toast(n.title, {
            description: n.body ?? undefined,
            icon: urgent ? <Siren className="h-4 w-4 text-danger" /> : <Bell className="h-4 w-4 text-primary" />,
            duration: urgent ? 8000 : 4500,
            action: n.link ? {
              label: "Open",
              onClick: () => { router.navigate({ to: n.link! }); },
            } : undefined,
          });
        })
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (p) => setItems((prev) => prev.map((n) => n.id === (p.new as Notif).id ? (p.new as Notif) : n)))
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [user]);

  const markAll = async () => {
    if (!user || unread === 0) return;
    const ids = items.filter((n) => !n.read_at).map((n) => n.id);
    setItems((prev) => prev.map((n) => n.read_at ? n : { ...n, read_at: new Date().toISOString() }));
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
  };

  const markOne = async (id: string) => {
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  };

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative flex h-8 w-8 items-center justify-center rounded-full border border-border/40 bg-card/50 text-subtext backdrop-blur-sm transition-all hover:border-primary/25 hover:bg-card hover:text-foreground hover:shadow-soft"
        >
          <Bell className="h-[16px] w-[16px]" strokeWidth={1.8} />
          <AnimatePresence>
            {unread > 0 && (
              <motion.span
                initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-danger px-[3px] text-[9px] font-bold text-danger-foreground shadow-danger"
              >
                {unread > 9 ? "9+" : unread}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] sm:w-96 p-0 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <div className="font-bold">Notifications</div>
            <div className="text-xs text-subtext">{unread} unread</div>
          </div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={markAll} className="h-8 rounded-full text-xs">
              <CheckCheck className="mr-1 h-3.5 w-3.5" /> Mark all
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto divide-y divide-border">
          {items.length === 0 && (
            <div className="p-8 text-center text-sm text-subtext">You're all caught up 🎉</div>
          )}
          {items.map((n) => {
            const content = (
              <div className={`flex gap-3 px-4 py-3 hover:bg-muted/60 transition-colors ${!n.read_at ? "bg-primary/5" : ""}`}>
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-primary"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground">{n.title}</div>
                  {n.body && <div className="mt-0.5 text-xs text-subtext line-clamp-2">{n.body}</div>}
                  <div className="mt-1 text-[10px] uppercase tracking-wider text-subtext">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
            );
            return n.link ? (
              <Link key={n.id} to={n.link} onClick={() => markOne(n.id)} className="block">{content}</Link>
            ) : (
              <button key={n.id} onClick={() => markOne(n.id)} className="block w-full text-left">{content}</button>
            );
          })}
        </div>
        <Link to="/notifications" className="block border-t border-border bg-muted/40 px-4 py-2.5 text-center text-xs font-semibold text-primary hover:bg-muted">
          View all notifications
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
