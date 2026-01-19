import { Header } from "@/components/Layout/Header";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, MessageCircle, TrendingUp } from "lucide-react";
import { AdvancedSearch } from "@/components/Explore/AdvancedSearch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Explore = () => {
  const { data: trendingPosts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["trending-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles (username, avatar_url)
        `)
        .order("likes_count", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Explore</h1>
        
        <Tabs defaultValue="discover">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="discover" className="flex-1">Discover</TabsTrigger>
            <TabsTrigger value="search" className="flex-1">Search</TabsTrigger>
          </TabsList>

          <TabsContent value="discover">
            {postsLoading ? (
              <div className="grid grid-cols-3 gap-1">
                {[...Array(9)].map((_, i) => (
                  <Skeleton key={i} className="aspect-square" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {trendingPosts.map((post: any) => (
                  <div key={post.id} className="aspect-square bg-muted overflow-hidden relative group cursor-pointer">
                    <img
                      src={post.media_urls?.[0]}
                      alt={post.caption || "Post"}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
                      <div className="flex items-center gap-1">
                        <Heart className="h-5 w-5" />
                        <span>{post.likes_count}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-5 w-5" />
                        <span>{post.comments_count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="search">
            <AdvancedSearch />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Explore;
