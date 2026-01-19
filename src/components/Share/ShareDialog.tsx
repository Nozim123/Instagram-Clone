import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: "post" | "reel" | "story";
  contentId: string;
}

export const ShareDialog = ({ open, onOpenChange, contentType, contentId }: ShareDialogProps) => {
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations", currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];

      const { data, error } = await supabase
        .from("conversation_participants")
        .select(`
          conversation:conversations (
            id,
            name,
            is_group,
            conversation_participants (
              user:profiles (
                id,
                username,
                avatar_url
              )
            )
          )
        `)
        .eq("user_id", currentUser.id);

      if (error) throw error;

      return data
        .map((cp: any) => cp.conversation)
        .filter((conv: any) => {
          if (!search) return true;
          const otherUser = conv.conversation_participants.find(
            (p: any) => p.user.id !== currentUser.id
          )?.user;
          return otherUser?.username.toLowerCase().includes(search.toLowerCase());
        });
    },
    enabled: !!currentUser && open,
  });

  const shareMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      if (!currentUser) throw new Error("Not authenticated");

      const messageData: any = {
        conversation_id: conversationId,
        sender_id: currentUser.id,
        message_type: "shared_content",
        content: message || null,
      };

      if (contentType === "post") messageData.shared_post_id = contentId;
      else if (contentType === "reel") messageData.shared_reel_id = contentId;
      else if (contentType === "story") messageData.shared_story_id = contentId;

      const { error } = await supabase.from("messages").insert(messageData);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      toast({ title: "Shared successfully!" });
      onOpenChange(false);
      setMessage("");
      setSearch("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to share content",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <Input
            placeholder="Add a message (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {conversations.map((conv: any) => {
                const otherUser = conv.conversation_participants.find(
                  (p: any) => p.user.id !== currentUser?.id
                )?.user;

                return (
                  <div
                    key={conv.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={otherUser?.avatar_url} />
                        <AvatarFallback>
                          {otherUser?.username?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">
                          {conv.is_group ? conv.name : `@${otherUser?.username}`}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => shareMutation.mutate(conv.id)}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}

              {conversations.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No conversations found
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
