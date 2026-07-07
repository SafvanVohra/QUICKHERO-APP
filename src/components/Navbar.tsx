import { Link, useRouter } from "@tanstack/react-router";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useEffect, useState } from "react";
import { LayoutDashboard, LogOut, Menu, ShieldCheck, Siren, User as UserIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { NotificationsBell } from "@/components/NotificationsBell";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { toast } from "sonner";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "How it works", to: "/#how" },
  { label: "Safety", to: "/#safety" },
  { label: "Volunteer", to: "/volunteer" },
];

export function Navbar() {
  const { user } = useAuth();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string | null; photo_url: string | null; is_verified: boolean | null } | null>(null);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 12));

  useEffect(() => { setOpen(false); }, [router.state.location.pathname, router.state.location.hash]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!user) { setIsAdmin(false); setProfile(null); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
    supabase.from("profiles").select("full_name, photo_url, is_verified").eq("id", user.id).maybeSingle()
      .then(({ data }) => setProfile(data ?? null));
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.navigate({ to: "/", replace: true });
  };

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Account";
  const initials = (profile?.full_name ?? user?.email ?? "?")
    .split(/\s+|@/).filter(Boolean).map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? "glass shadow-elevate" : "bg-gradient-to-b from-background/95 to-background/35"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="group flex min-w-0 items-center gap-2.5">
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-card shadow-primary ring-1 ring-primary/25 transition-transform duration-300 group-hover:scale-105">
            <span className="absolute inset-1 rounded-xl bg-gradient-danger opacity-15" />
            <img src="/favicon.png" alt="QuickHero logo" width={44} height={44} className="relative h-10 w-10 object-contain" />
          </span>
          <span className="truncate font-display text-xl font-extrabold tracking-tight">
            Quick<span className="text-primary">Hero</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 rounded-full border border-border/60 bg-card/50 p-1 shadow-soft backdrop-blur">
          {navLinks.map((l) => {
            const path = router.state.location.pathname;
            const hash = router.state.location.hash;
            const active = l.to.startsWith("/#")
              ? path === "/" && `#${hash}` === l.to.slice(1)
              : l.to === "/"
                ? path === "/" && !hash
                : path === l.to;
            return (
              <a
                key={l.to}
                href={l.to}
                className={`relative rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  active ? "text-primary-foreground" : "text-subtext hover:text-foreground"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-gradient-primary shadow-primary"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                {l.label}
              </a>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              <NotificationsBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="group flex items-center gap-1.5 rounded-full border border-border/50 bg-card/60 py-0.5 pl-0.5 pr-2.5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-elevate">
                    <Avatar className="h-7 w-7 ring-1 ring-primary/25">
                      {profile?.photo_url && <img src={profile.photo_url} alt="" className="h-full w-full object-cover" />}
                      <AvatarFallback className="bg-gradient-primary text-[10px] font-bold text-primary-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden lg:inline-flex max-w-[110px] items-center gap-1 truncate text-xs font-semibold text-foreground/90">
                      <span className="truncate">{displayName}</span>
                      <VerifiedBadge verified={profile?.is_verified} size="xs" />
                    </span>
                    <svg className="h-3 w-3 text-subtext opacity-60 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 rounded-2xl border-border/70 p-2 shadow-elevate">
                  <DropdownMenuLabel className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                        {profile?.photo_url && <img src={profile.photo_url} alt="" className="h-full w-full object-cover" />}
                        <AvatarFallback className="bg-gradient-primary text-sm font-bold text-primary-foreground">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold inline-flex items-center gap-1">
                          <span className="truncate">{displayName}</span>
                          <VerifiedBadge verified={profile?.is_verified} size="xs" />
                        </div>
                        <div className="truncate text-xs font-normal text-subtext">{user.email}</div>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer rounded-xl py-2.5 font-medium">
                    <Link to="/dashboard"><LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer rounded-xl py-2.5 font-medium">
                    <Link to="/profile"><UserIcon className="mr-2 h-4 w-4" /> Profile</Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild className="cursor-pointer rounded-xl py-2.5 font-medium text-primary">
                      <Link to="/admin"><ShieldCheck className="mr-2 h-4 w-4" /> Admin panel</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={signOut}
                    className="cursor-pointer rounded-xl py-2.5 font-medium text-danger focus:bg-danger/10 focus:text-danger"
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="rounded-full font-semibold">
                Sign in
              </Button>
            </Link>
          )}
          <Link to={user ? "/request/new" : "/auth"}>
            <Button variant="danger" className="rounded-full px-5 shadow-danger">
              <Siren className="h-4 w-4" strokeWidth={3} />
              Get help now
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          {user && <NotificationsBell />}
          <button
            className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elevate"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-[68px] inset-x-0 bottom-0 z-45 overflow-y-auto space-y-4 border-t border-border/70 bg-card/98 px-4 py-6 shadow-elevate backdrop-blur-xl md:hidden"
        >
          {user && (
            <div className="mb-3 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 p-3">
              <Avatar className="h-11 w-11 ring-2 ring-primary/25">
                {profile?.photo_url && <img src={profile.photo_url} alt="" className="h-full w-full object-cover" />}
                <AvatarFallback className="bg-gradient-primary text-sm font-bold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold inline-flex items-center gap-1">
                  <span className="truncate">{displayName}</span>
                  <VerifiedBadge verified={profile?.is_verified} size="xs" />
                </div>
                <div className="truncate text-xs text-subtext">{user.email}</div>
              </div>
            </div>
          )}
          {navLinks.map((l) => (
            <a
              key={l.to}
              href={l.to}
              className="block rounded-2xl px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              {l.label}
            </a>
          ))}
          <div className="flex flex-col gap-2 pt-3">
            {user ? (
              <>
                <Link to="/dashboard" className="w-full">
                  <Button variant="outline" className="w-full rounded-full">
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                  </Button>
                </Link>
                <Link to="/profile" className="w-full">
                  <Button variant="outline" className="w-full rounded-full">
                    <UserIcon className="mr-2 h-4 w-4" /> Profile
                  </Button>
                </Link>
                {isAdmin && (
                  <Link to="/admin" className="w-full">
                    <Button variant="outline" className="w-full rounded-full text-primary">
                      <ShieldCheck className="mr-2 h-4 w-4" /> Admin
                    </Button>
                  </Link>
                )}
                <Button
                  onClick={signOut}
                  variant="outline"
                  className="w-full rounded-full border-danger/40 text-danger hover:bg-danger/5"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </Button>
              </>
            ) : (
              <Link to="/auth" className="w-full">
                <Button variant="outline" className="w-full rounded-full">Sign in</Button>
              </Link>
            )}
            <Link to={user ? "/request/new" : "/auth"} className="w-full">
              <Button variant="danger" className="w-full rounded-full shadow-danger">
                <Siren className="h-4 w-4" strokeWidth={3} />
                Get help now
              </Button>
            </Link>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
}
