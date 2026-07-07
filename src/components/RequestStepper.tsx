import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Siren, Users, XCircle } from "lucide-react";

type Status = "open" | "accepted" | "in_progress" | "resolved" | "cancelled";

const STEPS: { key: Exclude<Status, "cancelled">; label: string; icon: typeof Siren }[] = [
  { key: "open", label: "Alert sent", icon: Siren },
  { key: "accepted", label: "Hero accepted", icon: Users },
  { key: "in_progress", label: "On the way", icon: Loader2 },
  { key: "resolved", label: "Resolved", icon: CheckCircle2 },
];

const ORDER: Record<Exclude<Status, "cancelled">, number> = {
  open: 0, accepted: 1, in_progress: 2, resolved: 3,
};

export function RequestStepper({ status }: { status: Status }) {
  const cancelled = status === "cancelled";
  const activeIdx = cancelled ? -1 : ORDER[status];

  if (cancelled) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-3 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-danger"
      >
        <XCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <div className="text-sm font-bold">Alert cancelled</div>
          <div className="text-xs opacity-80">This request is no longer active.</div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Request status: ${STEPS[activeIdx]?.label ?? "in progress"}`}
      className="rounded-2xl border border-border bg-card/60 p-4 shadow-soft"
    >
      <ol className="flex items-center justify-between gap-1 sm:gap-2">
        {STEPS.map((s, i) => {
          const done = i < activeIdx;
          const active = i === activeIdx;
          const Icon = s.icon;
          return (
            <li key={s.key} className="flex flex-1 items-center gap-1 sm:gap-2">
              <div className="flex flex-col items-center gap-1.5 min-w-0">
                <motion.span
                  initial={false}
                  animate={{
                    scale: active ? 1.08 : 1,
                    backgroundColor: done || active ? "var(--color-primary, #2563eb)" : "transparent",
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-full ring-2 transition-colors ${
                    done || active
                      ? "text-primary-foreground ring-primary shadow-primary"
                      : "text-subtext ring-border bg-muted"
                  }`}
                >
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full bg-primary/40 animate-ping"
                    />
                  )}
                  <Icon
                    className={`relative h-4 w-4 ${active && s.key === "in_progress" ? "animate-spin" : ""}`}
                    aria-hidden="true"
                  />
                </motion.span>
                <span
                  className={`text-[10px] font-semibold leading-tight text-center max-w-[68px] truncate sm:max-w-none sm:text-xs ${
                    active ? "text-foreground" : done ? "text-foreground/80" : "text-subtext"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="relative mx-0.5 h-1 flex-1 overflow-hidden rounded-full bg-muted sm:mx-1">
                  <motion.div
                    initial={false}
                    animate={{ width: done ? "100%" : active ? "50%" : "0%" }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="absolute inset-y-0 left-0 bg-gradient-primary"
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
