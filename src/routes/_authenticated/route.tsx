import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getStoredPreviewUser } from "@/hooks/use-session-user";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // 1. Check active Supabase session
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        return { user: sessionData.session.user };
      }
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        return { user: userData.user };
      }
    } catch (err) {
      console.warn("[Auth Guard] Supabase session check error:", err);
    }

    // 2. Check local preview user session
    const previewUser = getStoredPreviewUser();
    if (previewUser) {
      return { user: previewUser };
    }

    // 3. Not authenticated -> redirect to /auth
    throw redirect({ to: "/auth" });
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
