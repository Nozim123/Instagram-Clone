import { StoryCarousel } from "@/components/Feed/StoryCarousel";
import { PostCard } from "@/components/Feed/PostCard";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

const Feed = () => {
  const { shouldHideContent } = useBlockedUsers();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["feed-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          id,
          caption,
          media_urls,
          media_type,
          likes_count,
          comments_count,
          created_at,
          user_id,
          profiles!posts_user_id_fkey (
            id,
            username,
            avatar_url
          )
        `)
        .eq("is_archived", false)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => !post.user_id || !shouldHideContent(post.user_id));
  }, [posts, shouldHideContent]);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <StoryCarousel />
        <div className="space-y-4 py-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-full max-w-lg mx-auto space-y-3 p-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <StoryCarousel />
      <div className="space-y-4 py-4">
        {filteredPosts.map((post) => (
          <PostCard
            key={post.id}
            id={post.id}
            username={post.profiles?.username || "unknown"}
            avatar={post.profiles?.avatar_url || "/placeholder.svg"}
            image={post.media_urls?.[0] || "/placeholder.svg"}
            likes={post.likes_count || 0}
            caption={post.caption || ""}
            timestamp={formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            userId={post.user_id}
          />
        ))}
        {filteredPosts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No posts to show</p>
            <p className="text-sm">Follow some users to see their posts here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Feed;
