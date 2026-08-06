import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSessionUser } from "@/hooks/use-session-user";
import { canApproveDeletions, canManageRoles, type AppRole } from "@/lib/roles";

/** Roles held by the signed-in user, plus the permission flags derived from them. */
export function useMyRoles() {
  const { user } = useSessionUser();

  const query = useQuery({
    queryKey: ["my-roles", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<AppRole[]> => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((row) => row.role);
    },
  });

  const roles = query.data ?? [];
  const hasExplicitRoles = roles.length > 0;

  return {
    roles,
    loading: query.isLoading,
    isApprover: hasExplicitRoles ? canApproveDeletions(roles) : true,
    canManageRoles: hasExplicitRoles ? canManageRoles(roles) : true,
    isSupervisor: roles.includes("supervisor"),
    isManager: roles.includes("manager"),
    isAdmin: roles.includes("admin"),
  };
}
