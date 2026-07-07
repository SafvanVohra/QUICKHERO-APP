import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AlarmWatcher } from "@/components/AlarmWatcher";
import { LiveRequestsBar } from "@/components/LiveRequestsBar";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => (
    <>
      <AlarmWatcher />
      <LiveRequestsBar />
      <Outlet />
    </>
  ),
});
