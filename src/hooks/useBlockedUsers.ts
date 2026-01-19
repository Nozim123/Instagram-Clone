import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const useBlockedUsers = () => {
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: blockedUserIds = [] } = useQuery({
    queryKey: ["blocked-users", currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      
      const { data, error } = await (supabase as any)
        .from("user_blocks")
        .select("blocked_id")
        .eq("blocker_id", currentUser.id);

      if (error) throw error;
      return data.map((b: any) => b.blocked_id);
    },
    enabled: !!currentUser?.id,
  });

  const { data: blockedByIds = [] } = useQuery({
    queryKey: ["blocked-by", currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      
      const { data, error } = await (supabase as any)
        .from("user_blocks")
        .select("blocker_id")
        .eq("blocked_id", currentUser.id);

      if (error) throw error;
      return data.map((b: any) => b.blocker_id);
    },
    enabled: !!currentUser?.id,
  });

  const blockMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!currentUser?.id) throw new Error("Not authenticated");

      const { error } = await (supabase as any)
        .from("user_blocks")
        .insert({
          blocker_id: currentUser.id,
          blocked_id: userId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
      toast({ title: "User blocked", description: "You won't see their content anymore" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const unblockMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!currentUser?.id) throw new Error("Not authenticated");

      const { error } = await (supabase as any)
        .from("user_blocks")
        .delete()
        .eq("blocker_id", currentUser.id)
        .eq("blocked_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
      toast({ title: "User unblocked" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const isBlocked = (userId: string) => blockedUserIds.includes(userId);
  const isBlockedBy = (userId: string) => blockedByIds.includes(userId);
  const shouldHideContent = (userId: string) => isBlocked(userId) || isBlockedBy(userId);

  return {
    blockedUserIds,
    blockedByIds,
    isBlocked,
    isBlockedBy,
    shouldHideContent,
    blockUser: blockMutation.mutate,
    unblockUser: unblockMutation.mutate,
    isBlocking: blockMutation.isPending,
    isUnblocking: unblockMutation.isPending,
  };
};
