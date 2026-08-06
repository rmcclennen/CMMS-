import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMyRoles } from "@/hooks/use-my-roles";
import { ENTITY_LABELS, type DeletableEntity } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Check, ShieldCheck, Users, X, Clock, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/approvals")({
  head: () => ({
    meta: [
      { title: "Deletion & Change Approvals | CMMSCord AI" },
      {
        name: "description",
        content:
          "Review and approve requests to delete or change plant assets, PM schedules, and work orders.",
      },
      { property: "og:title", content: "Supervisor & Manager Approvals" },
      {
        property: "og:description",
        content: "Manager and supervisor sign-off on plant asset, PM, and work order removals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const { isApprover } = useMyRoles();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const requests = useQuery({
    queryKey: ["deletion-requests", tab],
    queryFn: async () => {
      let query = supabase
        .from("deletion_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (tab === "pending") query = query.eq("status", "pending");
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const approversQuery = useQuery({
    queryKey: ["team-approvers"],
    queryFn: async () => {
      const [{ data: directory }, { data: roles }] = await Promise.all([
        supabase.from("team_directory").select("id, full_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      const approverUserIds = new Set(
        (roles ?? [])
          .filter((r) => ["supervisor", "manager", "admin"].includes(r.role))
          .map((r) => r.user_id),
      );

      return (directory ?? []).filter((d) => approverUserIds.has(d.id));
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const note = notes[id]?.trim();
      const { error } = await supabase.rpc("decide_deletion_request", {
        _request_id: id,
        _approve: approve,
        ...(note ? { _note: note } : {}),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Decision recorded");
      queryClient.invalidateQueries({ queryKey: ["deletion-requests"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["pm-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rows = requests.data ?? [];
  const approvers = approversQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="label-caps text-xs tracking-wider text-muted-foreground uppercase">
            Change & Deletion Control
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Supervisor & Manager Approvals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Equipment, PM schedules, and work orders can only be removed with supervisor or manager
            sign-off.
          </p>
        </div>

        <Button asChild variant="outline" size="sm">
          <Link to="/team">
            <Users className="mr-1.5 size-4" /> Manage Team Roles
          </Link>
        </Button>
      </div>

      {/* Approver Status Card */}
      <div className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Sign-Off Authority
            </p>
            <p className="text-sm font-medium">
              {approvers.length > 0
                ? `${approvers.length} Designated Approver(s): ${approvers.map((a) => a.full_name).join(", ")}`
                : "Managers and Supervisors hold deletion sign-off authority."}
            </p>
          </div>
        </div>

        {!isApprover && (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Viewing in Requester Mode
          </Badge>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-1.5">
            <Clock className="size-3.5" /> Pending Sign-Off
          </TabsTrigger>
          <TabsTrigger value="all">All Request History</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          <div className="panel divide-y divide-border">
            {rows.map((req) => (
              <div
                key={req.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">
                    {ENTITY_LABELS[req.entity_type as DeletableEntity] ?? req.entity_type}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{req.entity_label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Requested {new Date(req.created_at).toLocaleString()}
                      {req.reason ? ` · Reason: “${req.reason}”` : ""}
                      {req.decision_note ? ` · Decision note: “${req.decision_note}”` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <Badge
                    variant={
                      req.status === "approved"
                        ? "default"
                        : req.status === "denied"
                          ? "destructive"
                          : "secondary"
                    }
                    className="capitalize"
                  >
                    {req.status}
                  </Badge>

                  {req.status === "pending" && isApprover && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        className="h-8 w-44 text-xs"
                        placeholder="Sign-off note…"
                        value={notes[req.id] ?? ""}
                        onChange={(e) =>
                          setNotes((prev) => ({ ...prev, [req.id]: e.target.value }))
                        }
                      />
                      <Button
                        size="sm"
                        className="h-8 gap-1"
                        disabled={decide.isPending}
                        onClick={() => decide.mutate({ id: req.id, approve: true })}
                      >
                        <Check className="size-3.5" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1 text-destructive hover:bg-destructive/10"
                        disabled={decide.isPending}
                        onClick={() => decide.mutate({ id: req.id, approve: false })}
                      >
                        <X className="size-3.5" /> Deny
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {requests.isLoading && (
              <p className="p-6 text-center text-sm text-muted-foreground">Loading requests…</p>
            )}

            {!requests.isLoading && rows.length === 0 && (
              <div className="p-8 text-center">
                <AlertTriangle className="mx-auto size-6 text-muted-foreground/50 mb-2" />
                <p className="text-sm font-medium">No deletion requests found.</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {tab === "pending"
                    ? "All requests have been reviewed and decided."
                    : "No deletion requests have been submitted yet."}
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
