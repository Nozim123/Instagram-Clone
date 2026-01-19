import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, Send, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { z } from "zod";

const commentSchema = z.object({
  content: z.string().min(1).max(500),
});

interface ReelCommentsProps {
  reelId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ReelComments = ({ reelId, isOpen, onClose }: ReelCommentsProps) => {
  const [commentText, setCommentText] = useState("");
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["reel-comments", reelId],
    queryFn: async () => {
      const { data: commentsData, error } = await supabase
        .from("reel_comments")
        .select("*")
        .eq("reel_id", reelId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return commentsData.map(comment => ({
        ...comment,
        username: profileMap.get(comment.user_id)?.username,
        avatar_url: profileMap.get(comment.user_id)?.avatar_url,
      }));
    },
    enabled: isOpen,
  });

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser) throw new Error("Not authenticated");

      const validation = commentSchema.safeParse({ content: commentText });
      if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
      }

      const { error } = await supabase.from("reel_comments").insert({
        reel_id: reelId,
        user_id: currentUser.id,
        content: commentText,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reel-comments", reelId] });
      queryClient.invalidateQueries({ queryKey: ["reels"] });
      setCommentText("");
    },
    onError: (error) => {
      toast({
        title: "Error posting comment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle>Comments</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-full pt-6">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No comments yet. Be the first to comment!
              </p>
            ) : (
              comments.map((comment: any) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.avatar_url} />
                    <AvatarFallback>{comment.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">@{comment.username}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{comment.content}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {comment.likes_count || 0}
                      </button>
                      <button className="text-xs text-muted-foreground hover:text-foreground">
                        Reply
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              maxLength={500}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  addCommentMutation.mutate();
                }
              }}
            />
            <Button
              size="icon"
              onClick={() => addCommentMutation.mutate()}
              disabled={!commentText.trim() || addCommentMutation.isPending}
            >
              {addCommentMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
