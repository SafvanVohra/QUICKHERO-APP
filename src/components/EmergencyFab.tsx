import { motion } from "framer-motion";
import { Siren } from "lucide-react";
import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";

export function EmergencyFab() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const confirm = async () => {
    setOpen(false);
    const { data } = await supabase.auth.getUser();
    router.navigate({ to: data.user ? "/request/new" : "/auth" });
  };

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 18, delay: 0.6 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Emergency help"
        className="fixed bottom-5 right-5 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-danger text-danger-foreground shadow-danger ring-4 ring-danger/15 sm:bottom-6 sm:right-6"
      >
        <span className="absolute inset-0 rounded-full bg-danger animate-sos" />
        <span className="absolute inset-0 rounded-full bg-danger animate-sos [animation-delay:0.9s]" />
        <Siren className="relative h-8 w-8 drop-shadow-sm" strokeWidth={3} />
      </motion.button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl">
              <Siren className="h-5 w-5 text-danger" strokeWidth={3} /> Send emergency alert?
            </AlertDialogTitle>
            <AlertDialogDescription>
              We'll share your current location with verified volunteers nearby.
              Only tap confirm if this is a real emergency.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirm}
              className="rounded-full bg-gradient-danger text-danger-foreground shadow-danger"
            >
              Send alert
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
