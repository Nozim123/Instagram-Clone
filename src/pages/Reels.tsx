import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/Layout/Header";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Send, MoreVertical, Music, Share2 } from "lucide-react";
import { ShareDialog } from "@/components/Share/ShareDialog";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ReelComments } from "@/components/Reels/ReelComments";

interface Reel {
  id: string;
  video_url: string;
  caption: string | null;
  music_name: string | null;
  likes_count: number;
  comments_count: number;
  views_count: number;
  user_id: string;
  username?: string;
  avatar_url?: string;
}

const Reels = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [selectedReelId, setSelectedReelId] = useState<string>("");
  const [shareOpen, setShareOpen] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const queryClient = useQueryClient();

  const { data: reels = [], isLoading } = useQuery({
    queryKey: ["reels"],
    queryFn: async () => {
      const { data: reelsData, error } = await supabase
        .from("reels")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch user profiles separately
      const userIds = [...new Set(reelsData.map(r => r.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return reelsData.map(reel => ({
        ...reel,
        username: profileMap.get(reel.user_id)?.username,
        avatar_url: profileMap.get(reel.user_id)?.avatar_url,
      })) as Reel[];
    },
  });

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: likedReels = [] } = useQuery({
    queryKey: ["liked-reels", currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      const { data, error } = await supabase
        .from("reel_likes")
        .select("reel_id")
        .eq("user_id", currentUser.id);
      if (error) throw error;
      return data.map(like => like.reel_id);
    },
    enabled: !!currentUser,
  });

  const likeMutation = useMutation({
    mutationFn: async (reelId: string) => {
      if (!currentUser) throw new Error("Not authenticated");

      const isLiked = likedReels.includes(reelId);
      
      if (isLiked) {
        const { error } = await supabase
          .from("reel_likes")
          .delete()
          .eq("reel_id", reelId)
          .eq("user_id", currentUser.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("reel_likes")
          .insert({ reel_id: reelId, user_id: currentUser.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reels"] });
      queryClient.invalidateQueries({ queryKey: ["liked-reels"] });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    const handleScroll = () => {
      const videos = videoRefs.current;
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;

      videos.forEach((video, index) => {
        if (!video) return;

        const rect = video.getBoundingClientRect();
        const isInView = rect.top >= 0 && rect.bottom <= windowHeight;

        if (isInView && index !== currentIndex) {
          setCurrentIndex(index);
        }

        if (isInView) {
          video.play().catch(console.error);
        } else {
          video.pause();
        }
      });
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [currentIndex, reels.length]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="h-[calc(100vh-64px)] flex items-center justify-center">
          <Skeleton className="w-full max-w-md aspect-[9/16]" />
        </div>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="h-[calc(100vh-64px)] flex flex-col items-center justify-center gap-4">
          <h2 className="text-2xl font-semibold">No Reels Yet</h2>
          <p className="text-muted-foreground">Be the first to create a reel!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="snap-y snap-mandatory h-[calc(100vh-64px)] overflow-y-scroll">
        {reels.map((reel, index) => (
          <div
            key={reel.id}
            className="snap-start snap-always h-[calc(100vh-64px)] relative flex items-center justify-center bg-black"
          >
            <video
              ref={(el) => (videoRefs.current[index] = el)}
              src={reel.video_url}
              loop
              playsInline
              className="h-full w-full object-contain"
              muted={false}
            />

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />

            {/* User info and actions */}
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-10 w-10 border-2 border-white">
                      <AvatarImage src={reel.avatar_url} />
                      <AvatarFallback>{reel.username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                    </Avatar>
                    <span className="font-semibold">@{reel.username}</span>
                    <Button variant="ghost" size="sm" className="text-white">
                      Follow
                    </Button>
                  </div>
                  
                  {reel.caption && (
                    <p className="text-sm mb-2">{reel.caption}</p>
                  )}
                  
                  {reel.music_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <Music className="h-4 w-4" />
                      <span>{reel.music_name}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-4 items-center">
                  <button
                    onClick={() => likeMutation.mutate(reel.id)}
                    className="flex flex-col items-center gap-1"
                  >
                    <Heart
                      className={`h-7 w-7 ${
                        likedReels.includes(reel.id)
                          ? "fill-red-500 text-red-500"
                          : "text-white"
                      }`}
                    />
                    <span className="text-xs">{reel.likes_count}</span>
                  </button>

                  <button
                    className="flex flex-col items-center gap-1"
                    onClick={() => {
                      setSelectedReelId(reel.id);
                      setCommentsOpen(true);
                    }}
                  >
                    <MessageCircle className="h-7 w-7 text-white" />
                    <span className="text-xs">{reel.comments_count}</span>
                  </button>

                  <button 
                    className="flex flex-col items-center gap-1"
                    onClick={() => {
                      setSelectedReelId(reel.id);
                      setShareOpen(true);
                    }}
                  >
                    <Share2 className="h-7 w-7 text-white" />
                  </button>

                  <button className="flex flex-col items-center gap-1">
                    <MoreVertical className="h-7 w-7 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </main>

      {selectedReelId && (
        <>
          <ReelComments
            reelId={selectedReelId}
            isOpen={commentsOpen}
            onClose={() => setCommentsOpen(false)}
          />
          <ShareDialog
            open={shareOpen}
            onOpenChange={setShareOpen}
            contentType="reel"
            contentId={selectedReelId}
          />
        </>
      )}
    </div>
  );
};

export default Reels;
