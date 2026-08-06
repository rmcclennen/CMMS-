import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export function getStoredPreviewUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("cmms_preview_user");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredPreviewUser(user: Partial<User> & { id: string; email: string }): User {
  const fullUser: User = {
    id: user.id,
    app_metadata: { provider: "email" },
    user_metadata: user.user_metadata || { full_name: user.email.split("@")[0] },
    aud: "authenticated",
    created_at: new Date().toISOString(),
    email: user.email,
    role: "authenticated",
    ...user,
  };
  if (typeof window !== "undefined") {
    localStorage.setItem("cmms_preview_user", JSON.stringify(fullUser));
  }
  return fullUser;
}

export function clearStoredPreviewUser(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("cmms_preview_user");
  }
}

export function useSessionUser() {
  const [user, setUser] = useState<User | null>(() => getStoredPreviewUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      try {
        // 1. Try Supabase getSession (fast cached check)
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          if (active) {
            setUser(sessionData.session.user);
            setLoading(false);
          }
          return;
        }

        // 2. Try Supabase getUser
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          if (active) {
            setUser(userData.user);
            setLoading(false);
          }
          return;
        }
      } catch (err) {
        console.warn("[Auth] Supabase check error:", err);
      }

      // 3. Check stored preview session
      const preview = getStoredPreviewUser();
      if (active) {
        setUser(preview);
        setLoading(false);
      }
    }

    checkAuth();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        const preview = getStoredPreviewUser();
        setUser(preview);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
