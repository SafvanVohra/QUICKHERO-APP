import { motion } from "framer-motion";
import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shiny animated "verified" tick shown next to a user's name.
 * Renders nothing when `verified` is false so it can be used inline safely.
 */
export function VerifiedBadge({
  verified,
  size = "sm",
  className,
  label = "Verified hero",
}: {
  verified: boolean | null | undefined;
  size?: "xs" | "sm" | "md";
  className?: string;
  label?: string;
}) {
  if (!verified) return null;

  const dim =
    size === "xs" ? "h-3.5 w-3.5" :
    size === "md" ? "h-5 w-5" :
    "h-4 w-4";

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center align-middle",
        className,
      )}
      title={label}
      aria-label={label}
    >
      {/* Shine sweep */}
      <motion.span
        aria-hidden="true"
        initial={{ opacity: 0.35, scale: 0.9 }}
        animate={{ opacity: [0.35, 0.75, 0.35], scale: [0.9, 1.25, 0.9] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        className={cn(
          "absolute inset-0 rounded-full blur-[3px]",
          "bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.55),transparent_70%)]",
        )}
      />
      <BadgeCheck
        className={cn(
          dim,
          "relative z-10 text-primary drop-shadow-[0_0_6px_rgba(37,99,235,0.6)]",
        )}
        strokeWidth={2.4}
        fill="currentColor"
        stroke="white"
      />
    </span>
  );
}
