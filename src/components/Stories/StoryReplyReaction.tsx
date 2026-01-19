import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, MessageCircle, Send, Smile } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface StoryReplyReactionProps {
  storyId: string;
  storyOwnerId: string;
  onClose?: () => void;
}

const REACTIONS = ["❤️", "🔥", "😍", "😂", "😮", "😢"];

export const StoryReplyReaction = ({ storyId, storyOwnerId, onClose }: StoryReplyReactionProps) => {
  const [replyText, setReplyText] = useState("");
  const [showReactions, setShowReactions] = useState(false);
  const queryClient = useQueryClient();

  const sendReactionMutation = useMutation({
    mutationFn: async (reaction: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Find or create conversation with story owner
      let conversationId: string;

      // Check for existing conversation
      const { data: existingConversations } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      const conversationIds = existingConversations?.map(c => c.conversation_id) || [];

      if (conversationIds.length > 0) {
        const { data: sharedConvo } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", storyOwnerId)
          .in("conversation_id", conversationIds)
          .limit(1)
          .maybeSingle();

        if (sharedConvo) {
          conversationId = sharedConvo.conversation_id;
        } else {
          // Create new conversation
          const { data: newConvo, error: convoError } = await supabase
            .from("conversations")
            .insert({ created_by: user.id, is_group: false })
            .select()
            .single();

          if (convoError) throw convoError;
          conversationId = newConvo.id;

          // Add participants
          await supabase.from("conversation_participants").insert([
            { conversation_id: conversationId, user_id: user.id },
            { conversation_id: conversationId, user_id: storyOwnerId },
          ]);
        }
      } else {
        // Create new conversation
        const { data: newConvo, error: convoError } = await supabase
          .from("conversations")
          .insert({ created_by: user.id, is_group: false })
          .select()
          .single();

        if (convoError) throw convoError;
        conversationId = newConvo.id;

        await supabase.from("conversation_participants").insert([
          { conversation_id: conversationId, user_id: user.id },
          { conversation_id: conversationId, user_id: storyOwnerId },
        ]);
      }

      // Send message with story reference
      const { error: messageError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: reaction,
        message_type: "story_reaction",
        shared_story_id: storyId,
      });

      if (messageError) throw messageError;
    },
    onSuccess: () => {
      toast({ title: "Reaction sent!" });
      setShowReactions(false);
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const sendReplyMutation = useMutation({
    mutationFn: async (text: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Find or create conversation (same logic as above)
      let conversationId: string;

      const { data: existingConversations } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      const conversationIds = existingConversations?.map(c => c.conversation_id) || [];

      if (conversationIds.length > 0) {
        const { data: sharedConvo } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", storyOwnerId)
          .in("conversation_id", conversationIds)
          .limit(1)
          .maybeSingle();

        if (sharedConvo) {
          conversationId = sharedConvo.conversation_id;
        } else {
          const { data: newConvo, error: convoError } = await supabase
            .from("conversations")
            .insert({ created_by: user.id, is_group: false })
            .select()
            .single();

          if (convoError) throw convoError;
          conversationId = newConvo.id;

          await supabase.from("conversation_participants").insert([
            { conversation_id: conversationId, user_id: user.id },
            { conversation_id: conversationId, user_id: storyOwnerId },
          ]);
        }
      } else {
        const { data: newConvo, error: convoError } = await supabase
          .from("conversations")
          .insert({ created_by: user.id, is_group: false })
          .select()
          .single();

        if (convoError) throw convoError;
        conversationId = newConvo.id;

        await supabase.from("conversation_participants").insert([
          { conversation_id: conversationId, user_id: user.id },
          { conversation_id: conversationId, user_id: storyOwnerId },
        ]);
      }

      const { error: messageError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: text,
        message_type: "story_reply",
        shared_story_id: storyId,
      });

      if (messageError) throw messageError;
    },
    onSuccess: () => {
      toast({ title: "Reply sent!" });
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSendReply = () => {
    if (replyText.trim()) {
      sendReplyMutation.mutate(replyText.trim());
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
      <div className="flex items-center gap-2">
        <Input
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Send a reply..."
          className="flex-1 bg-background/20 border-white/20 text-white placeholder:text-white/60"
          onKeyDown={(e) => e.key === "Enter" && handleSendReply()}
        />
        
        <Popover open={showReactions} onOpenChange={setShowReactions}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
              <Smile className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" side="top">
            <div className="flex gap-1">
              {REACTIONS.map((reaction) => (
                <Button
                  key={reaction}
                  variant="ghost"
                  size="sm"
                  className="text-2xl px-2"
                  onClick={() => sendReactionMutation.mutate(reaction)}
                  disabled={sendReactionMutation.isPending}
                >
                  {reaction}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20"
          onClick={() => sendReactionMutation.mutate("❤️")}
          disabled={sendReactionMutation.isPending}
        >
          <Heart className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20"
          onClick={handleSendReply}
          disabled={sendReplyMutation.isPending || !replyText.trim()}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};
