import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Activity, AlertTriangle, ArrowRight, Baby, Bike, CheckCircle2, Cross, Droplet,
  Flame, Heart, MapPin, MessageCircle, PawPrint, PersonStanding, Phone, Search,
  Shield, ShieldCheck, Siren, Sparkles, Star, Users, Utensils, Waves,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { EmergencyFab } from "@/components/EmergencyFab";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import heroImg from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QuickHero — One-tap emergency help from nearby volunteers" },
      { name: "description", content: "QuickHero sends your live location to trained, ID-verified volunteers nearby with a single tap — medical, safety, rescue, and everyday emergencies." },
      { property: "og:title", content: "QuickHero — One-tap emergency help from nearby volunteers" },
      { property: "og:description", content: "Send your live location to trained, ID-verified volunteers nearby with one tap. Real-time chat, live routes, and community-powered response." },
      { property: "og:url", content: "https://quickhero.lovable.app/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://quickhero.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: Landing,
});

const categories = [
  { icon: Cross, label: "Medical", color: "text-danger", bg: "bg-danger/10" },
  { icon: AlertTriangle, label: "Accident", color: "text-warning", bg: "bg-warning/10" },
  { icon: Flame, label: "Fire", color: "text-danger", bg: "bg-danger/10" },
  { icon: Droplet, label: "Blood", color: "text-danger", bg: "bg-danger/10" },
  { icon: ShieldCheck, label: "Women Safety", color: "text-primary", bg: "bg-primary/10" },
  { icon: Bike, label: "Vehicle", color: "text-secondary", bg: "bg-secondary/10" },
  { icon: Utensils, label: "Food", color: "text-accent", bg: "bg-accent/10" },
  { icon: Waves, label: "Flood", color: "text-secondary", bg: "bg-secondary/10" },
  { icon: Activity, label: "Earthquake", color: "text-warning", bg: "bg-warning/10" },
  { icon: Search, label: "Lost Person", color: "text-primary", bg: "bg-primary/10" },
  { icon: PawPrint, label: "Animal", color: "text-accent", bg: "bg-accent/10" },
  { icon: PersonStanding, label: "Senior", color: "text-primary", bg: "bg-primary/10" },
  { icon: Baby, label: "Pregnancy", color: "text-danger", bg: "bg-danger/10" },
  { icon: Sparkles, label: "Custom", color: "text-foreground", bg: "bg-muted" },
];

const steps = [
  { icon: Siren, title: "Tap the SOS", desc: "One tap sends your live location and emergency type to nearby heroes." },
  { icon: Users, title: "Volunteers respond", desc: "Verified helpers in your area accept and start moving toward you." },
  { icon: MessageCircle, title: "Chat & track", desc: "Realtime chat, live route, and arrival updates keep you in the loop." },
  { icon: CheckCircle2, title: "Help arrives", desc: "Rate the response and celebrate the hero who showed up." },
];

const testimonials = [
  { name: "Priya S.", role: "Rescued in Bangalore", quote: "A neighbour I'd never met arrived in 6 minutes. QuickHero is genuinely a lifeline." },
  { name: "Aarav M.", role: "Volunteer, 43 rescues", quote: "The interface is calm and clear even during the tensest moments. Best app on my phone." },
  { name: "Diana K.", role: "Mother of two", quote: "The pregnancy alert brought help before the ambulance. I sleep better knowing this exists." },
];

const faqs = [
  { q: "Is QuickHero free to use?", a: "Yes. Sending and accepting help requests is completely free for everyone." },
  { q: "How are volunteers verified?", a: "Every helper submits government ID and is reviewed by our team before receiving requests." },
  { q: "Does it work without internet?", a: "You need a data connection to alert helpers, but SMS fallback is on the roadmap for low-signal areas." },
  { q: "Who sees my location?", a: "Only volunteers you've accepted see your live location, and only for the duration of the request." },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { y: 16, opacity: 0 }, show: { y: 0, opacity: 1, transition: { duration: 0.5 } } };

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden bg-hero pt-20 pb-14 sm:pt-36 sm:pb-28">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-80">
          <div className="absolute inset-0 bg-mesh" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid items-center gap-6 sm:gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
            {/* Left column: copy + CTA */}
            <motion.div initial="hidden" animate="show" variants={container} className="order-1">
              <motion.div variants={item} className="mb-6 inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-semibold text-primary shadow-soft">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-70 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                </span>
                12,481 verified heroes on standby now
              </motion.div>

              <motion.h1
                variants={item}
                className="font-display text-4xl font-extrabold tracking-tight leading-[1.05] sm:text-6xl md:text-7xl"
              >
                Help arrives in{" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  minutes
                </span>
                , not hours.
              </motion.h1>

              <motion.p variants={item} className="mt-6 max-w-xl text-lg leading-relaxed text-subtext sm:text-xl">
                QuickHero is the fastest way to reach <strong className="font-bold text-foreground">verified neighbours</strong> during
                a medical, safety, or rescue emergency — <strong className="font-bold text-foreground">one tap</strong> sends your live
                location to trained volunteers nearby.
              </motion.p>

              {/* Mobile Hero Art: shown between description and search only on mobile/tablet */}
              <motion.div
                variants={item}
                className="relative my-8 lg:hidden"
              >
                <div className="relative aspect-[5/4] sm:aspect-square w-full max-w-[340px] sm:max-w-[480px] mx-auto">
                  <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-tr from-primary/20 via-accent/10 to-secondary/20 blur-2xl" />
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    className="relative h-full w-full rounded-[2rem] bg-card p-1.5 shadow-elevate ring-1 ring-white/60"
                  >
                    <img
                      src={heroImg}
                      alt="Community heroes responding to an emergency"
                      width={1280} height={1024}
                      className="h-full w-full rounded-[1.5rem] object-cover"
                    />
                  </motion.div>

                  {/* Floating alert card */}
                  <motion.div
                    initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.6 }}
                    className="absolute -left-2 top-6 hidden sm:block"
                  >
                    <div className="glass flex items-center gap-3 rounded-2xl p-2.5 shadow-elevate">
                      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-danger text-danger-foreground">
                        <Siren className="h-4.5 w-4.5" strokeWidth={3} />
                        <span className="absolute inset-0 rounded-xl bg-danger/40 animate-sos" />
                      </span>
                      <div>
                        <div className="text-[11px] font-bold">Medical · 0.4 km</div>
                        <div className="text-[9px] text-subtext">2 heroes accepted</div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Floating hero card */}
                  <motion.div
                    initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.6 }}
                    className="absolute -right-2 bottom-12 hidden sm:block"
                  >
                    <div className="glass flex items-center gap-3 rounded-2xl p-2.5 shadow-elevate">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground font-bold shadow-primary text-sm">
                        MD
                      </div>
                      <div>
                        <div className="text-[11px] font-bold">Meera D. · Nurse</div>
                        <div className="flex items-center gap-1 text-[9px] text-subtext">
                          <Star className="h-2.5 w-2.5 fill-warning text-warning" /> 4.9 · Arriving in 3m
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>

              <motion.div variants={item} id="request" className="mt-8 sm:mt-10 flex max-w-xl flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-subtext" />
                  <label htmlFor="hero-help-search" className="sr-only">
                    What kind of help do you need?
                  </label>
                  <Input
                    id="hero-help-search"
                    aria-label="What kind of help do you need?"
                    placeholder="What kind of help do you need?"
                    className="h-14 rounded-full border-border bg-card pl-12 pr-4 text-base shadow-soft focus-visible:ring-primary"
                  />
                </div>
                <Link to="/request/new" className="relative w-full sm:w-auto">
                  <span aria-hidden className="absolute inset-0 -z-10 animate-ping rounded-full bg-danger/25 sm:hidden" />
                  <Button size="lg" variant="danger" className="h-14 w-full rounded-full px-8 text-base shadow-danger sm:w-auto">
                    <Siren className="mr-2 h-5 w-5" strokeWidth={3} /> Request help
                  </Button>
                </Link>
              </motion.div>

              <motion.div variants={item} className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-subtext">
                <a href="#volunteer" className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline">
                  Become a volunteer <ArrowRight className="h-4 w-4" />
                </a>
                <Link to="/auth" className="hover:text-foreground">Already a member?</Link>
                <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-success" /> ID-verified network</span>
              </motion.div>

              {/* Trust chips */}
              <motion.div variants={item} className="mt-10 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { icon: MapPin, label: "Live location", tone: "text-primary bg-primary/10" },
                  { icon: Shield, label: "Verified heroes", tone: "text-accent bg-accent/10" },
                  { icon: Heart, label: "24/7 response", tone: "text-danger bg-danger/10" },
                ].map((c) => (
                  <div key={c.label} className="glass rounded-2xl p-3 text-center shadow-soft">
                    <span className={`mx-auto flex h-9 w-9 items-center justify-center rounded-xl ${c.tone}`}>
                      <c.icon className="h-4 w-4" />
                    </span>
                    <div className="mt-2 text-xs font-semibold">{c.label}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right column: hero art with floating cards */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative order-2 hidden lg:block"
            >
              <div className="relative aspect-[5/4] sm:aspect-square w-full max-w-[340px] sm:max-w-[560px] mx-auto">
                <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-tr from-primary/20 via-accent/10 to-secondary/20 blur-2xl" />
                <motion.div
                  animate={{ y: [0, -12, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="relative h-full w-full rounded-[2.5rem] bg-card p-2 shadow-elevate ring-1 ring-white/60"
                >
                  <img
                    src={heroImg}
                    alt="Community heroes responding to an emergency"
                    width={1280} height={1024}
                    className="h-full w-full rounded-[2rem] object-cover"
                  />
                </motion.div>

                {/* Floating alert card */}
                <motion.div
                  initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.6 }}
                  className="absolute -left-4 top-8 sm:-left-10 hidden sm:block"
                >
                  <div className="glass flex items-center gap-3 rounded-2xl p-3 shadow-elevate">
                    <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-danger text-danger-foreground">
                      <Siren className="h-5 w-5" strokeWidth={3} />
                      <span className="absolute inset-0 rounded-xl bg-danger/40 animate-sos" />
                    </span>
                    <div>
                      <div className="text-xs font-bold">Medical · 0.4 km</div>
                      <div className="text-[10px] text-subtext">2 heroes accepted</div>
                    </div>
                  </div>
                </motion.div>

                {/* Floating hero card */}
                <motion.div
                  initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.6 }}
                  className="absolute -right-4 bottom-16 sm:-right-8 hidden sm:block"
                >
                  <div className="glass flex items-center gap-3 rounded-2xl p-3 shadow-elevate">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground font-bold shadow-primary">
                      MD
                    </div>
                    <div>
                      <div className="text-xs font-bold">Meera D. · Nurse</div>
                      <div className="flex items-center gap-1 text-[10px] text-subtext">
                        <Star className="h-3 w-3 fill-warning text-warning" /> 4.9 · Arriving in 3m
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-8 px-4 py-14 sm:px-6 md:grid-cols-4">
          {[
            { label: "Verified heroes", value: 12481 },
            { label: "Lives helped", value: 38290 },
            { label: "Avg. response (min)", value: 6 },
            { label: "Cities live", value: 42 },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-display text-3xl font-extrabold tracking-tighter leading-[1.05] sm:text-5xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                <AnimatedCounter to={s.value} suffix={s.label.includes("Avg") ? "" : "+"} />
              </div>
              <div className="mt-1 text-sm font-medium text-subtext">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Emergency types</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tighter leading-[1.05] sm:text-5xl">
            Every emergency has a category — and a hero.
          </h2>
          <p className="mt-4 text-lg text-subtext">
            Tap what's happening. We route your alert to the volunteers trained for that situation.
          </p>
        </div>

        <motion.div
          initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}
          variants={container}
          className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7"
        >
          {categories.map((c) => (
            <motion.button
              key={c.label}
              variants={item}
              whileHover={{ y: -4 }}
              className="group flex flex-col items-center gap-3 rounded-3xl border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-elevate"
            >
              <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${c.bg} ${c.color}`}>
                <c.icon className="h-6 w-6" />
              </span>
              <span className="text-sm font-semibold">{c.label}</span>
            </motion.button>
          ))}
        </motion.div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="bg-muted/40 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">How it works</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tighter leading-[1.05] sm:text-5xl">
              Four steps between distress and relief.
            </h2>
          </div>

          {/* Mobile: connected vertical timeline */}
          <ol className="relative mt-12 space-y-5 md:hidden">
            <span aria-hidden className="absolute left-[27px] top-2 bottom-2 w-px bg-gradient-to-b from-primary via-accent to-primary/30" />
            {steps.map((s, i) => (
              <motion.li
                key={s.title}
                initial={{ x: -20, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="relative flex gap-4"
              >
                <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-primary">
                  <s.icon className="h-6 w-6" strokeWidth={2.2} />
                  <span className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-card text-[11px] font-black text-primary ring-2 ring-primary/30">
                    {i + 1}
                  </span>
                </span>
                <div className="min-w-0 flex-1 rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
                  <h3 className="text-base font-bold leading-tight">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-subtext">{s.desc}</p>
                </div>
              </motion.li>
            ))}
          </ol>

          {/* Desktop: 4-up grid (unchanged) */}
          <div className="mt-14 hidden gap-6 md:grid md:grid-cols-4">
            {steps.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ y: 30, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative rounded-3xl bg-card p-6 shadow-soft"
              >
                <span className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground shadow-primary">
                  {i + 1}
                </span>
                <s.icon className="h-8 w-8 text-primary" />
                <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-subtext">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* NEARBY HEROES PREVIEW */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">Heroes nearby</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tighter leading-[1.05] sm:text-5xl">
              A community that shows up.
            </h2>
            <p className="mt-4 text-lg text-subtext">
              Every hero on QuickHero is a verified neighbour, first-aider, driver,
              nurse, or good samaritan willing to help when it counts.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {["Government ID verification", "Skill & training badges", "Community ratings", "Instant availability toggle"].map((f) => (
                <li key={f} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <div className="absolute inset-0 -z-10 bg-hero rounded-4xl" />
            <div className="space-y-4">
              {[
                { name: "Meera D.", tag: "Nurse • 0.4 km", rating: 4.9, tone: "bg-danger/10 text-danger" },
                { name: "Arjun P.", tag: "First-aid • 0.9 km", rating: 4.8, tone: "bg-primary/10 text-primary" },
                { name: "Kiran R.", tag: "Driver • 1.2 km", rating: 4.7, tone: "bg-accent/10 text-accent" },
              ].map((h, i) => (
                <motion.div
                  key={h.name}
                  initial={{ x: 30, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass flex items-center gap-4 rounded-3xl p-4 shadow-elevate"
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl font-bold ${h.tone}`}>
                    {h.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{h.name}</div>
                    <div className="text-sm text-subtext">{h.tag}</div>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-semibold">
                    <Star className="h-4 w-4 fill-warning text-warning" /> {h.rating}
                  </div>
                  <Button size="sm" variant="hero" className="rounded-full shadow-primary">Ping</Button>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* VOLUNTEER CTA */}
      <section id="volunteer" className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <div className="relative overflow-hidden rounded-4xl bg-gradient-primary p-10 shadow-primary sm:p-16">
          <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-80 w-80 rounded-full bg-accent/30 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-2 lg:items-center">
            <div className="text-primary-foreground">
              <h2 className="font-display text-3xl font-extrabold tracking-tighter leading-[1.05] sm:text-5xl">
                Be the reason someone gets home safe.
              </h2>
              <p className="mt-4 text-lg text-primary-foreground/85">
                Join thousands of verified heroes responding to emergencies in their neighbourhood.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link to="/auth" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full rounded-full bg-card text-foreground hover:bg-card/90 sm:w-auto">
                  Become a hero
                </Button>
              </Link>
              <a href="#how" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full rounded-full border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 sm:w-auto">
                  Learn how QuickHero works
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-muted/40 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">Stories</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tighter leading-[1.05] sm:text-5xl">
              Real people. Real rescues.
            </h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <motion.figure
                key={t.name}
                initial={{ y: 30, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-3xl bg-card p-6 shadow-soft"
              >
                <div className="flex gap-1 text-warning">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <blockquote className="mt-4 text-base text-foreground">"{t.quote}"</blockquote>
                <figcaption className="mt-6 text-sm">
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-subtext">{t.role}</div>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </section>

      {/* SAFETY + FAQ */}
      <section id="safety" className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="grid gap-16 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">Safety</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tighter leading-[1.05] sm:text-4xl">
              Built with safety at the core.
            </h2>
            <ul className="mt-8 space-y-5">
              {[
                { icon: ShieldCheck, title: "End-to-end verification", desc: "Every hero is ID-checked before receiving alerts." },
                { icon: MapPin, title: "Location you control", desc: "Live location is only shared with accepted responders and only during a live request." },
                { icon: Phone, title: "Always call emergency services", desc: "QuickHero complements — never replaces — official emergency numbers." },
              ].map((s) => (
                <li key={s.title} className="flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <s.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="font-semibold">{s.title}</div>
                    <p className="text-sm text-subtext">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">FAQ</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tighter leading-[1.05] sm:text-4xl">
              Everything you might ask.
            </h2>
            <Accordion type="single" collapsible className="mt-8">
              {faqs.map((f) => (
                <AccordionItem key={f.q} value={f.q} className="rounded-2xl border border-border bg-card px-4 mb-3">
                  <AccordionTrigger className="text-left font-semibold">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-subtext">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border bg-card/95">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <Link to="/" className="group flex items-center gap-2.5">
              <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-background shadow-primary ring-1 ring-primary/20 transition-transform group-hover:scale-105">
                <span className="absolute inset-1 rounded-xl bg-gradient-danger opacity-15" />
                <img src="/favicon.png" alt="QuickHero logo" width={44} height={44} className="relative h-10 w-10 object-contain" />
              </span>
              <span className="text-lg font-extrabold">Quick<span className="text-primary">Hero</span></span>
            </Link>
            <div className="flex flex-wrap gap-6 text-sm text-subtext">
              <a href="#how" className="hover:text-foreground">How it works</a>
              <a href="#safety" className="hover:text-foreground">Safety</a>
              <a href="#volunteer" className="hover:text-foreground">Volunteer</a>
              <Link to="/auth" className="hover:text-foreground">Sign in</Link>
            </div>
          </div>
          <div className="mt-8 border-t border-border pt-6 text-xs text-subtext">
            © {new Date().getFullYear()} QuickHero. In a life-threatening emergency, always call your local emergency number first.
          </div>
        </div>
      </footer>

      <EmergencyFab />
    </div>
  );
}
