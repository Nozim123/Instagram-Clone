import { Header } from "@/components/Layout/Header";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, MessageCircle, UserPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const Activity = () => {
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["activities", currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];

      // Get follows
      const { data: followsData } = await supabase
        .from("follows")
        .select(`
          id,
          created_at,
          follower:profiles!follows_follower_id_fkey(id, username, avatar_url),
          following:profiles!follows_following_id_fkey(id)
        `)
        .eq("following_id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(20);

      // Get user's post IDs first
      const { data: userPosts } = await supabase
        .from("posts")
        .select("id")
        .eq("user_id", currentUser.id);

      const postIds = userPosts?.map(p => p.id) || [];

      // Get likes on user's posts
      const { data: likesData } = postIds.length > 0 ? await supabase
        .from("likes")
        .select(`
          id,
          created_at,
          user:profiles(id, username, avatar_url),
          post:posts(id, media_urls)
        `)
        .in("post_id", postIds)
        .order("created_at", { ascending: false })
        .limit(20) : { data: [] };

      // Get comments on user's posts
      const { data: commentsData } = postIds.length > 0 ? await supabase
        .from("comments")
        .select(`
          id,
          created_at,
          content,
          user:profiles(id, username, avatar_url),
          post:posts(id, media_urls)
        `)
        .in("post_id", postIds)
        .order("created_at", { ascending: false })
        .limit(20) : { data: [] };

      const allActivities = [
        ...(followsData || []).map(f => ({ ...f, type: "follow" })),
        ...(likesData || []).map(l => ({ ...l, type: "like" })),
        ...(commentsData || []).map(c => ({ ...c, type: "comment" })),
      ];

      return allActivities.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: !!currentUser,
  });

  const renderActivity = (activity: any) => {
    const user = activity.follower || activity.user;
    const timeAgo = formatDistanceToNow(new Date(activity.created_at), { addSuffix: true });

    return (
      <div key={activity.id} className="flex items-start gap-3 p-4 hover:bg-muted/50">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user?.avatar_url} />
          <AvatarFallback>{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {activity.type === "follow" && <UserPlus className="h-4 w-4 text-primary" />}
            {activity.type === "like" && <Heart className="h-4 w-4 text-red-500" />}
            {activity.type === "comment" && <MessageCircle className="h-4 w-4 text-blue-500" />}
            
            <p className="text-sm">
              <span className="font-semibold">@{user?.username}</span>
              {activity.type === "follow" && " started following you"}
              {activity.type === "like" && " liked your post"}
              {activity.type === "comment" && " commented on your post"}
            </p>
          </div>

          {activity.type === "comment" && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {activity.content}
            </p>
          )}

          <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
        </div>

        {(activity.type === "like" || activity.type === "comment") && activity.post?.media_urls?.[0] && (
          <img
            src={activity.post.media_urls[0]}
            alt="Post"
            className="w-12 h-12 object-cover rounded"
          />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Activity</h1>

        <Tabs defaultValue="all">
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
            <TabsTrigger value="follows" className="flex-1">Follows</TabsTrigger>
            <TabsTrigger value="likes" className="flex-1">Likes</TabsTrigger>
            <TabsTrigger value="comments" className="flex-1">Comments</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-0 divide-y">
            {activities.map(renderActivity)}
            {activities.length === 0 && (
              <p className="text-center text-muted-foreground py-12">
                No activity yet
              </p>
            )}
          </TabsContent>

          <TabsContent value="follows" className="space-y-0 divide-y">
            {activities.filter(a => a.type === "follow").map(renderActivity)}
          </TabsContent>

          <TabsContent value="likes" className="space-y-0 divide-y">
            {activities.filter(a => a.type === "like").map(renderActivity)}
          </TabsContent>

          <TabsContent value="comments" className="space-y-0 divide-y">
            {activities.filter(a => a.type === "comment").map(renderActivity)}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Activity;
