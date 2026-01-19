import { useState } from "react";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, BookmarkPlus, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface PostCardProps {
  id?: string;
  username: string;
  avatar?: string;
  image: string;
  likes: number;
  caption: string;
  timestamp: string;
  userId?: string;
}

export const PostCard = ({ id, username, avatar, image, likes, caption, timestamp, userId }: PostCardProps) => {
  const [isSaved, setIsSaved] = useState(false);
  const [showCollectionDialog, setShowCollectionDialog] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [optimisticLikes, setOptimisticLikes] = useState(likes);
  const [optimisticLiked, setOptimisticLiked] = useState(false);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  // Check if user has liked this post
  const { data: userLike } = useQuery({
    queryKey: ["post-like", id, currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id || !id) return null;
      const { data } = await supabase
        .from("likes")
        .select("id")
        .eq("user_id", currentUser.id)
        .eq("post_id", id)
        .maybeSingle();
      return data;
    },
    enabled: !!currentUser?.id && !!id,
  });

  // Sync optimistic state with actual data
  const isLiked = userLike ? true : optimisticLiked;
  const displayLikes = userLike !== undefined ? (userLike ? likes : likes) : optimisticLikes;

  const { data: collections = [] } = useQuery({
    queryKey: ["saved-collections", currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const { data, error } = await supabase
        .from("saved_collections")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentUser?.id,
  });

  const { data: savedPost } = useQuery({
    queryKey: ["saved-post", id, currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id || !id) return null;
      const { data } = await supabase
        .from("saved_posts")
        .select("*")
        .eq("user_id", currentUser.id)
        .eq("post_id", id)
        .maybeSingle();
      return data;
    },
    enabled: !!currentUser?.id && !!id,
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser?.id || !id) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("likes")
        .insert({
          user_id: currentUser.id,
          post_id: id,
        });
      if (error) throw error;

      // Update post likes count
      await supabase
        .from("posts")
        .update({ likes_count: likes + 1 })
        .eq("id", id);
    },
    onMutate: () => {
      setOptimisticLiked(true);
      setOptimisticLikes(likes + 1);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-like", id] });
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
    },
    onError: () => {
      setOptimisticLiked(false);
      setOptimisticLikes(likes);
      toast({ title: "Error", description: "Failed to like post", variant: "destructive" });
    },
  });

  const unlikeMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser?.id || !id) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("likes")
        .delete()
        .eq("user_id", currentUser.id)
        .eq("post_id", id);
      if (error) throw error;

      // Update post likes count
      await supabase
        .from("posts")
        .update({ likes_count: Math.max(0, likes - 1) })
        .eq("id", id);
    },
    onMutate: () => {
      setOptimisticLiked(false);
      setOptimisticLikes(Math.max(0, likes - 1));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-like", id] });
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
    },
    onError: () => {
      setOptimisticLiked(true);
      setOptimisticLikes(likes);
      toast({ title: "Error", description: "Failed to unlike post", variant: "destructive" });
    },
  });

  const handleLikeToggle = () => {
    if (!currentUser) {
      toast({ title: "Please log in to like posts" });
      return;
    }
    
    if (userLike || optimisticLiked) {
      unlikeMutation.mutate();
    } else {
      likeMutation.mutate();
    }
  };

  const savePostMutation = useMutation({
    mutationFn: async ({ collectionId, collectionName }: { collectionId?: string; collectionName?: string }) => {
      if (!currentUser?.id || !id) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("saved_posts")
        .insert({
          user_id: currentUser.id,
          post_id: id,
          collection_id: collectionId || null,
          collection_name: collectionName || "All",
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-post", id] });
      queryClient.invalidateQueries({ queryKey: ["saved-posts"] });
      setIsSaved(true);
      toast({ title: "Post saved" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const unsavePostMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser?.id || !id) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("saved_posts")
        .delete()
        .eq("user_id", currentUser.id)
        .eq("post_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-post", id] });
      queryClient.invalidateQueries({ queryKey: ["saved-posts"] });
      setIsSaved(false);
      toast({ title: "Post removed from saved" });
    },
  });

  const createCollectionMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!currentUser?.id) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("saved_collections")
        .insert({
          user_id: currentUser.id,
          name,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["saved-collections"] });
      if (id) {
        savePostMutation.mutate({ collectionId: data.id, collectionName: data.name });
      }
      setNewCollectionName("");
      setShowCollectionDialog(false);
    },
  });

  const handleSaveToCollection = (collectionId?: string, collectionName?: string) => {
    if (savedPost) {
      unsavePostMutation.mutate();
    } else {
      savePostMutation.mutate({ collectionId, collectionName });
    }
    setShowCollectionDialog(false);
  };

  const handleCreateAndSave = () => {
    if (newCollectionName.trim()) {
      createCollectionMutation.mutate(newCollectionName.trim());
    }
  };

  const isPostSaved = !!savedPost || isSaved;
  const currentLikeState = userLike !== undefined ? !!userLike : optimisticLiked;
  const currentLikeCount = userLike !== undefined 
    ? (userLike ? likes : likes) 
    : optimisticLikes;

  return (
    <>
      <Card className="w-full max-w-lg mx-auto border-0 border-b border-border rounded-none">
        {/* Post Header */}
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={avatar} alt={username} />
              <AvatarFallback>{username[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="font-semibold text-sm">{username}</span>
          </div>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>

        {/* Post Image */}
        <div className="relative aspect-square w-full bg-muted">
          <img
            src={image}
            alt="Post"
            className="w-full h-full object-cover"
            onDoubleClick={handleLikeToggle}
          />
        </div>

        {/* Post Actions */}
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={handleLikeToggle}
              >
                <Heart 
                  className={`h-6 w-6 transition-colors ${
                    currentLikeState 
                      ? "fill-red-500 text-red-500" 
                      : "hover:text-muted-foreground"
                  }`} 
                />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MessageCircle className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Send className="h-6 w-6" />
              </Button>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Bookmark className={`h-6 w-6 ${isPostSaved ? "fill-current" : ""}`} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => handleSaveToCollection()}>
                  <BookmarkPlus className="h-4 w-4 mr-2" />
                  {isPostSaved ? "Remove from Saved" : "Save Post"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {collections.map((collection) => (
                  <DropdownMenuItem
                    key={collection.id}
                    onClick={() => handleSaveToCollection(collection.id, collection.name)}
                  >
                    <Bookmark className="h-4 w-4 mr-2" />
                    {collection.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowCollectionDialog(true)}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Create New Collection
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Likes */}
          <div className="font-semibold text-sm">
            {(currentLikeState ? likes + (userLike ? 0 : 1) : likes - (userLike ? 1 : 0)).toLocaleString()} likes
          </div>

          {/* Caption */}
          <div className="text-sm">
            <span className="font-semibold mr-2">{username}</span>
            <span>{caption}</span>
          </div>

          {/* Timestamp */}
          <div className="text-xs text-muted-foreground uppercase">
            {timestamp}
          </div>
        </div>
      </Card>

      {/* Create Collection Dialog */}
      <Dialog open={showCollectionDialog} onOpenChange={setShowCollectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              placeholder="Collection name"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateAndSave()}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCollectionDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateAndSave} disabled={!newCollectionName.trim()}>
                Create & Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
