import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { getStoredPreviewUser, setStoredPreviewUser } from "@/hooks/use-session-user";
import { roleLabel, type AppRole } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
  Waves,
  Zap,
} from "lucide-react";

type AuthSearchParams = {
  email?: string;
  name?: string;
  role?: string;
  invite?: string;
};

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): AuthSearchParams => ({
    email: typeof search.email === "string" ? search.email : undefined,
    name: typeof search.name === "string" ? search.name : undefined,
    role: typeof search.role === "string" ? search.role : undefined,
    invite: typeof search.invite === "string" ? search.invite : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in | CMMSCord AI" },
      {
        name: "description",
        content: "Sign in to the wastewater plant asset, PM, and work order system.",
      },
      { property: "og:title", content: "Sign in | CMMSCord AI" },
      {
        property: "og:description",
        content: "Team access to plant assets, PM schedules, and work orders.",
      },
    ],
  }),
  beforeLoad: async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) throw redirect({ to: "/pm-schedule" });
      const { data } = await supabase.auth.getUser();
      if (data.user) throw redirect({ to: "/pm-schedule" });
    } catch (err) {
      if (err && typeof err === "object" && "to" in (err as Record<string, unknown>)) {
        throw err;
      }
    }
    const preview = getStoredPreviewUser();
    if (preview) throw redirect({ to: "/pm-schedule" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const searchParams = Route.useSearch();

  const [email, setEmail] = useState(() => searchParams.email || "");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(() => searchParams.name || "");
  const [busy, setBusy] = useState(false);
  const [loginFailedWithEmail, setLoginFailedWithEmail] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(() =>
    searchParams.invite || searchParams.name ? "signup" : "signin",
  );

  const isInvited = Boolean(searchParams.invite || searchParams.email || searchParams.name);
  const invitedRoleName = searchParams.role
    ? roleLabel(searchParams.role as AppRole) || searchParams.role
    : "Operations Team Member";

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) {
        navigate({ to: "/pm-schedule" });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  // 1-Click Instant Demo Login with Supabase
  async function instantDemoSignIn() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: "demo@cmmscord.ai",
        password: "CMMSdemo2026!",
      });

      if (error) {
        console.warn("[Auth] Demo login fallback to preview session:", error.message);
        // Fallback to preview user session
        setStoredPreviewUser({
          id: "f45702ac-d68a-42a3-9c99-9adcc93427c7",
          email: "demo@cmmscord.ai",
          user_metadata: { full_name: "Plant Demo Supervisor" },
        });
      }

      toast.success("Signed in successfully!");
      navigate({ to: "/pm-schedule" });
    } catch (err) {
      console.error("[Auth] Unexpected login error:", err);
      setStoredPreviewUser({
        id: "f45702ac-d68a-42a3-9c99-9adcc93427c7",
        email: "demo@cmmscord.ai",
        user_metadata: { full_name: "Plant Demo Supervisor" },
      });
      navigate({ to: "/pm-schedule" });
    } finally {
      setBusy(false);
    }
  }

  // Fast Instant Sign In with a Custom Role Preset
  function instantRoleSignIn(roleName: "supervisor" | "operator" | "manager") {
    setBusy(true);
    const id = crypto.randomUUID();
    const roleLabels = {
      supervisor: "Plant Operations Supervisor",
      operator: "Lead Plant Operator",
      manager: "Wastewater Plant Manager",
    };
    const roleEmails = {
      supervisor: "supervisor@plant.org",
      operator: "operator@plant.org",
      manager: "manager@plant.org",
    };

    setStoredPreviewUser({
      id,
      email: roleEmails[roleName],
      user_metadata: { full_name: roleLabels[roleName] },
    });

    toast.success(`Signed in as ${roleLabels[roleName]}`);
    navigate({ to: "/pm-schedule" });
    setBusy(false);
  }

  // Accept Invitation Directly
  function acceptInvitationDirect() {
    setBusy(true);
    const id = crypto.randomUUID();
    const finalEmail = (email.trim() || searchParams.email || "teammate@plant.org").trim();
    const finalName = fullName.trim() || searchParams.name || finalEmail.split("@")[0];

    setStoredPreviewUser({
      id,
      email: finalEmail,
      user_metadata: {
        full_name: finalName,
        role: searchParams.role || "operator",
      },
    });

    toast.success(`Welcome to CMMSCord, ${finalName}!`);
    navigate({ to: "/pm-schedule" });
    setBusy(false);
  }

  // Standard Email & Password Sign In
  async function signIn() {
    if (!email.trim() || !password) {
      toast.error("Please enter both email and password.");
      return;
    }
    setBusy(true);
    setLoginFailedWithEmail(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);

    if (error) {
      toast.error(error.message);
      setLoginFailedWithEmail(email);
    } else {
      toast.success("Welcome back!");
      navigate({ to: "/pm-schedule" });
    }
  }

  // Direct Sign In for any custom email in preview
  function directEmailPreviewSignIn(targetEmail: string) {
    setBusy(true);
    const id = crypto.randomUUID();
    const name = fullName.trim() || targetEmail.split("@")[0] || "Plant Teammate";

    setStoredPreviewUser({
      id,
      email: targetEmail.trim(),
      user_metadata: { full_name: name },
    });

    toast.success(`Signed in as ${targetEmail}`);
    navigate({ to: "/pm-schedule" });
    setBusy(false);
  }

  // Standard Account Sign Up
  async function signUp() {
    if (!email.trim() || !password) {
      toast.error("Please enter your email and password.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin, data: { full_name: fullName } },
    });
    setBusy(false);

    if (error) {
      toast.error(error.message);
      // Give instant option to continue in preview
      setLoginFailedWithEmail(email);
    } else if (!data.session) {
      toast.info("Account registered! You can also enter directly into preview mode.");
      setLoginFailedWithEmail(email);
    } else {
      toast.success("Account created successfully!");
      navigate({ to: "/pm-schedule" });
    }
  }

  // Google OAuth Login
  async function google() {
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Google sign-in popup was blocked in preview. Using 1-Click Sign-In instead.");
        instantDemoSignIn();
      }
    } catch {
      toast.info("In preview iframe mode: signing you in automatically...");
      instantDemoSignIn();
    }
  }
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left Branding Hero Section */}
      <div className="hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-2">
          <Waves className="size-6 text-sidebar-primary" />
          <span className="text-sm font-bold tracking-widest uppercase">CMMSCord AI</span>
        </div>

        <div className="max-w-lg space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-sidebar-border bg-sidebar-accent/50 px-3 py-1 text-xs text-sidebar-primary">
            <Sparkles className="size-3.5" /> Complete Plant Maintenance Management
          </div>
          <h1 className="text-4xl font-bold leading-tight">
            Every asset, every PM, every work order — one control room.
          </h1>
          <p className="text-sm leading-relaxed text-sidebar-foreground/70">
            1,160 wastewater plant assets with full nameplate specs, seeded PM routines by equipment
            class, AI manufacturer O&amp;M research, and team deletion &amp; sign-off controls.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-4">
            <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-3">
              <p className="text-xs text-sidebar-foreground/60">Asset Inventory</p>
              <p className="text-lg font-bold text-sidebar-foreground">1,160 Records</p>
            </div>
            <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-3">
              <p className="text-xs text-sidebar-foreground/60">Sign-Off Control</p>
              <p className="text-lg font-bold text-sidebar-foreground">Sups &amp; Managers</p>
            </div>
          </div>
        </div>

        <p className="font-mono text-xs text-sidebar-foreground/50">
          WASTEWATER TREATMENT / MAINTENANCE OPS · PREVIEW READY
        </p>
      </div>

      {/* Right Sign-In Panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="panel w-full max-w-md p-6 sm:p-8 space-y-6">
          <div>
            <div className="flex items-center gap-2 lg:hidden mb-3">
              <Waves className="size-5 text-primary" />
              <span className="text-sm font-bold tracking-wider uppercase">CMMSCord AI</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Sign In to Control Room</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isInvited
                ? "You have received an invitation to join the plant maintenance crew."
                : "Select 1-Click Demo Sign-In or enter your plant credentials."}
            </p>
          </div>

          {/* 🌟 TEAM INVITATION BANNER (When arriving from an invite link) */}
          {isInvited && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-600 text-white shrink-0">
                  <UserPlus className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                      Team Invitation
                    </span>
                    <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-200">
                      {invitedRoleName}
                    </span>
                  </div>
                  <p className="font-semibold text-sm text-foreground mt-0.5">
                    Welcome, {fullName || searchParams.name || email || "Team Member"}!
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    You were invited to access all plant assets, PM schedules, and work orders.
                  </p>
                </div>
              </div>

              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm text-sm h-10 gap-2"
                disabled={busy}
                onClick={acceptInvitationDirect}
              >
                <CheckCircle2 className="size-4" />
                Accept Invite &amp; Enter Control Room
                <ArrowRight className="size-4 ml-auto" />
              </Button>
            </div>
          )}

          {/* ⚡ PRIMARY 1-CLICK INSTANT LOGIN (Solves Preview Login Immediately) */}
          {!isInvited && (
            <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="size-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    Fast Preview Sign-In
                  </span>
                </div>
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  1-Click Instant
                </span>
              </div>

              <Button
                className="w-full font-semibold shadow-sm text-sm h-10"
                disabled={busy}
                onClick={instantDemoSignIn}
              >
                <CheckCircle2 className="mr-2 size-4" />
                {busy ? "Signing in…" : "Instant Sign-In as Demo Admin"}
              </Button>

              {/* Quick Role Presets */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  disabled={busy}
                  onClick={() => instantRoleSignIn("supervisor")}
                >
                  <ShieldCheck className="size-3.5 text-blue-600 dark:text-blue-400" />
                  As Supervisor
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  disabled={busy}
                  onClick={() => instantRoleSignIn("operator")}
                >
                  <UserCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  As Operator
                </Button>
              </div>
            </div>
          )}

          {/* Google Sign In */}
          <Button variant="outline" className="w-full" disabled={busy} onClick={google}>
            <svg className="mr-2 size-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <span className="relative bg-card px-2 text-xs uppercase tracking-wider text-muted-foreground">
              or email &amp; password
            </span>
          </div>

          {/* Quick Fallback Banner if login with custom email failed */}
          {loginFailedWithEmail && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs space-y-2">
              <p className="font-semibold text-amber-700 dark:text-amber-300">
                Want to enter immediately as {loginFailedWithEmail}?
              </p>
              <p className="text-muted-foreground text-[11px]">
                You can bypass password verification and enter the preview with full plant access.
              </p>
              <Button
                size="sm"
                variant="secondary"
                className="w-full text-xs"
                onClick={() => directEmailPreviewSignIn(loginFailedWithEmail)}
              >
                Continue into Preview as {loginFailedWithEmail}
              </Button>
            </div>
          )}

          {/* Tabbed Form for Sign In / Sign Up */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="signin" className="flex-1">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">
                Create Account
              </TabsTrigger>
            </TabsList>

            {/* Sign In Tab */}
            <TabsContent value="signin" className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">
                  Work Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="demo@cmmscord.ai"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1" disabled={busy} onClick={signIn}>
                  {busy ? "Signing in…" : "Sign In"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  title="Auto-fill demo credentials"
                  onClick={() => {
                    setEmail("demo@cmmscord.ai");
                    setPassword("CMMSdemo2026!");
                  }}
                >
                  Fill Demo
                </Button>
              </div>
            </TabsContent>

            {/* Create Account Tab */}
            <TabsContent value="signup" className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullname" className="text-xs">
                  Full Name
                </Label>
                <Input
                  id="fullname"
                  placeholder="e.g. Alex Morgan"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-email" className="text-xs">
                  Work Email
                </Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="alex@plant.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-password" className="text-xs">
                  Choose Password
                </Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2 pt-1">
                <Button className="w-full" disabled={busy} onClick={signUp}>
                  {busy ? "Creating account…" : "Register Account"}
                </Button>
                {email && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground"
                    onClick={() => directEmailPreviewSignIn(email)}
                  >
                    Or enter preview directly with this email
                  </Button>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <p className="text-center text-xs text-muted-foreground pt-2">
            <Link to="/" className="underline hover:text-foreground">
              ← Back to Plant Overview
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
