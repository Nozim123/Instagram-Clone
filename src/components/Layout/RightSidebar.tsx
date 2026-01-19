import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

export function RightSidebar() {
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      return data;
    },
  });

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ["suggested-users"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get users the current user is not following
      const { data: following } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      const followingIds = following?.map((f) => f.following_id) || [];
      followingIds.push(user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, full_name")
        .not("id", "in", `(${followingIds.join(",")})`)
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  const { data: trending } = useQuery({
    queryKey: ["trending-hashtags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hashtags")
        .select("*")
        .order("posts_count", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  const followMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("follows").insert({
        follower_id: user.id,
        following_id: userId,
        status: "accepted",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggested-users"] });
      toast({ title: "Following!" });
    },
  });

  return (
    <aside className="hidden lg:block w-80 p-4 space-y-4">
      {/* Current User */}
      {currentUser && (
        <Card>
          <CardContent className="pt-4">
            <Link to="/profile" className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={currentUser.avatar_url || undefined} />
                <AvatarFallback>{currentUser.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{currentUser.full_name || currentUser.username}</p>
                <p className="text-sm text-muted-foreground truncate">@{currentUser.username}</p>
              </div>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Suggested Users */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Suggested for you</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-20 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))
          ) : suggestions?.length === 0 ? (
            <p className="text-sm text-muted-foreground">No suggestions available</p>
          ) : (
            suggestions?.map((user) => (
              <div key={user.id} className="flex items-center gap-3">
                <Link to={`/${user.username}`}>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>{user.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/${user.username}`} className="font-semibold text-sm truncate block hover:underline">
                    {user.username}
                  </Link>
                  <p className="text-xs text-muted-foreground truncate">{user.full_name || "Suggested for you"}</p>
                </div>
                <Button
                  variant="link"
                  size="sm"
                  className="text-accent text-xs font-semibold p-0"
                  onClick={() => followMutation.mutate(user.id)}
                  disabled={followMutation.isPending}
                >
                  Follow
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Trending */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Trending</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {trending?.length === 0 ? (
            <p className="text-sm text-muted-foreground">No trending topics</p>
          ) : (
            trending?.map((tag) => (
              <Link
                key={tag.id}
                to={`/explore?tag=${tag.tag}`}
                className="block hover:bg-secondary p-2 rounded-lg -mx-2"
              >
                <p className="font-semibold text-sm">#{tag.tag}</p>
                <p className="text-xs text-muted-foreground">{tag.posts_count} posts</p>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      {/* Footer Links */}
      <div className="text-xs text-muted-foreground space-x-2">
        <Link to="/about" className="hover:underline">About</Link>
        <span>·</span>
        <Link to="/privacy" className="hover:underline">Privacy</Link>
        <span>·</span>
        <Link to="/terms" className="hover:underline">Terms</Link>
        <span>·</span>
        <span>© 2024 DonoNet</span>
      </div>
    </aside>
  );
}