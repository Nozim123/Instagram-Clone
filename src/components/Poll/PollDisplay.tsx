import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { Check } from "lucide-react";

interface Poll {
  id: string;
  question: string;
  options: string[];
  ends_at: string | null;
}

interface PollVote {
  option_index: number;
  user_id: string;
}

interface PollDisplayProps {
  poll: Poll;
  postId: string;
}

export function PollDisplay({ poll, postId }: PollDisplayProps) {
  const queryClient = useQueryClient();

  const { data: votes } = useQuery({
    queryKey: ["poll-votes", poll.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("poll_votes")
        .select("option_index, user_id")
        .eq("poll_id", poll.id);

      if (error) throw error;
      return data as PollVote[];
    },
  });

  const { data: currentUser } = useQuery({
    queryKey: ["current-user-poll"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const hasVoted = votes?.some((v) => v.user_id === currentUser?.id);
  const userVote = votes?.find((v) => v.user_id === currentUser?.id)?.option_index;
  const totalVotes = votes?.length || 0;

  const voteMutation = useMutation({
    mutationFn: async (optionIndex: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await (supabase as any).from("poll_votes").insert({
        poll_id: poll.id,
        user_id: user.id,
        option_index: optionIndex,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["poll-votes", poll.id] });
      toast({ title: "Vote recorded!" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to vote",
        variant: "destructive",
      });
    },
  });

  const getVoteCount = (optionIndex: number) => {
    return votes?.filter((v) => v.option_index === optionIndex).length || 0;
  };

  const getPercentage = (optionIndex: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((getVoteCount(optionIndex) / totalVotes) * 100);
  };

  const options = Array.isArray(poll.options) ? poll.options : [];

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <p className="font-semibold">{poll.question}</p>

      <div className="space-y-2">
        {options.map((option, index) => {
          const percentage = getPercentage(index);
          const isSelected = userVote === index;

          return (
            <button
              key={index}
              onClick={() => !hasVoted && voteMutation.mutate(index)}
              disabled={hasVoted || voteMutation.isPending}
              className="w-full text-left relative"
            >
              <div
                className={`border rounded-lg p-3 transition-colors ${
                  hasVoted ? "cursor-default" : "hover:bg-secondary cursor-pointer"
                } ${isSelected ? "border-accent" : "border-border"}`}
              >
                <div className="flex items-center justify-between relative z-10">
                  <span className="flex items-center gap-2">
                    {String(option)}
                    {isSelected && <Check className="h-4 w-4 text-accent" />}
                  </span>
                  {hasVoted && (
                    <span className="text-sm font-semibold">{percentage}%</span>
                  )}
                </div>
                {hasVoted && (
                  <Progress
                    value={percentage}
                    className="absolute inset-0 h-full rounded-lg opacity-20"
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">{totalVotes} votes</p>
    </div>
  );
}