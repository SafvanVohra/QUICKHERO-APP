import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Award, CheckCircle2, Clock, Heart, MapPin, ShieldCheck, Sparkles, Users,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { EmergencyFab } from "@/components/EmergencyFab";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/volunteer")({
  head: () => ({
    meta: [
      { title: "Become a Hero — Volunteer with QuickHero" },
      { name: "description", content: "Join QuickHero as an ID-verified volunteer and respond to real emergencies in your neighbourhood — set your skills, availability, and radius." },
      { property: "og:title", content: "Become a Hero — Volunteer with QuickHero" },
      { property: "og:description", content: "Join thousands of verified heroes responding to real medical, safety, and rescue emergencies nearby." },
      { property: "og:url", content: "https://quickhero.lovable.app/volunteer" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://quickhero.lovable.app/volunteer" }],
  }),
  component: VolunteerPage,
});

const perks = [
  { icon: ShieldCheck, title: "Verified network", desc: "Every hero is ID-checked so victims can trust who's coming." },
  { icon: MapPin, title: "Only nearby alerts", desc: "You'll only see requests within a distance you set." },
  { icon: Clock, title: "You choose availability", desc: "Toggle on when free, off when you can't respond. No pressure." },
  { icon: Award, title: "Recognition & badges", desc: "Earn skill badges, ratings, and public thanks from people you help." },
];

const steps = [
  { n: 1, title: "Sign up", desc: "Create your account with email or phone." },
  { n: 2, title: "Verify identity", desc: "Upload a government ID — reviewed within 24 hours." },
  { n: 3, title: "Set your skills", desc: "Tell us what you can do: first-aid, driving, nursing, etc." },
  { n: 4, title: "Go live", desc: "Flip availability on and start responding to nearby alerts." },
];

function VolunteerPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden bg-hero pt-28 pb-20 sm:pt-36 sm:pb-24">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-80">
          <div className="absolute inset-0 bg-mesh" />
          <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-background to-transparent" />
        </div>
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <motion.div
            initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-semibold text-primary shadow-soft"
          >
            <Sparkles className="h-3.5 w-3.5" /> Join 12,000+ verified heroes
          </motion.div>
          <motion.h1
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="font-display text-4xl font-extrabold tracking-tight leading-[1.05] sm:text-6xl md:text-7xl"
          >
            Become a{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              hero
            </span>{" "}
            in your neighbourhood.
          </motion.h1>
          <motion.p
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-subtext sm:text-xl"
          >
            Respond to real emergencies near you. No shifts. No cost.
            Just verified neighbours showing up for each other.
          </motion.p>
          <motion.div
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link to="/auth" className="w-full sm:w-auto">
              <Button size="lg" variant="hero" className="h-14 w-full rounded-full px-8 text-base shadow-primary sm:w-auto">
                <Heart className="mr-2 h-5 w-5" strokeWidth={2.5} /> Become a hero
              </Button>
            </Link>
            <Link to="/" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="h-14 w-full rounded-full px-8 text-base sm:w-auto">
                Back to home
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* PERKS */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Why volunteer</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight leading-[1.1] sm:text-5xl">
            Built around your life.
          </h2>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {perks.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ y: 24, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-3xl bg-card p-6 shadow-soft"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <p.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-bold">{p.title}</h3>
              <p className="mt-1.5 text-sm text-subtext">{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* STEPS */}
      <section className="bg-muted/40 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">Get started</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight leading-[1.1] sm:text-5xl">
              Four steps to your first rescue.
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ y: 24, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="relative rounded-3xl bg-card p-6 shadow-soft"
              >
                <span className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground shadow-primary">
                  {s.n}
                </span>
                <h3 className="mt-3 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-subtext">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="relative overflow-hidden rounded-4xl bg-gradient-primary p-10 shadow-primary sm:p-16">
          <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-80 w-80 rounded-full bg-accent/30 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-2 lg:items-center">
            <div className="text-primary-foreground">
              <h2 className="font-display text-3xl font-extrabold tracking-tight leading-[1.05] sm:text-5xl">
                Ready to be the reason someone gets home safe?
              </h2>
              <p className="mt-4 text-lg text-primary-foreground/85">
                Sign up in under 2 minutes. Verify when you're ready.
              </p>
              <div className="mt-4 flex items-center gap-4 text-sm text-primary-foreground/85">
                <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" /> 12,481 heroes</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Free forever</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link to="/auth" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full rounded-full bg-card text-foreground hover:bg-card/90 sm:w-auto">
                  Become a hero
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <EmergencyFab />
    </div>
  );
}
