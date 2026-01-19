import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Layout/Header";
import { HighlightManager } from "@/components/Stories/HighlightManager";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Settings, Grid3X3, Bookmark, User as UserIcon, Film, Ban, MessageCircle, MoreHorizontal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const UserProfile = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isBlocked, isBlockedBy, blockUser, unblockUser, isBlocking, isUnblocking, shouldHideContent } = useBlockedUsers();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: posts = [] } = useQuery({
    queryKey: ["user-posts", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", profile.id)
        .eq("is_archived", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const { data: isFollowing } = useQuery({
    queryKey: ["is-following", currentUser?.id, profile?.id],
    queryFn: async () => {
      if (!currentUser || !profile?.id) return false;

      const { data, error } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", currentUser.id)
        .eq("following_id", profile.id)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!currentUser && !!profile?.id,
  });

  const { data: followersList = [] } = useQuery({
    queryKey: ["followers", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data: followsData, error } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", profile.id)
        .eq("status", "accepted");

      if (error) throw error;

      const followerIds = followsData.map(f => f.follower_id);
      if (followerIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, full_name")
        .in("id", followerIds);

      if (profilesError) throw profilesError;
      return profiles;
    },
    enabled: !!profile?.id,
  });

  const { data: followingList = [] } = useQuery({
    queryKey: ["following", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data: followsData, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", profile.id)
        .eq("status", "accepted");

      if (error) throw error;

      const followingIds = followsData.map(f => f.following_id);
      if (followingIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, full_name")
        .in("id", followingIds);

      if (profilesError) throw profilesError;
      return profiles;
    },
    enabled: !!profile?.id,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser || !profile?.id) throw new Error("Not authenticated");

      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUser.id)
          .eq("following_id", profile.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("follows")
          .insert({
            follower_id: currentUser.id,
            following_id: profile.id,
            status: "accepted",
          });

        if (error) throw error;

        // Create notification
        await supabase.from("notifications").insert({
          user_id: profile.id,
          actor_id: currentUser.id,
          type: "follow",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["is-following"] });
      queryClient.invalidateQueries({ queryKey: ["followers"] });
      toast({
        title: isFollowing ? "Unfollowed" : "Following",
        description: isFollowing
          ? `You unfollowed @${username}`
          : `You are now following @${username}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isOwnProfile = currentUser?.id === profile?.id;
  const userIsBlocked = profile?.id ? isBlocked(profile.id) : false;
  const userBlockedMe = profile?.id ? isBlockedBy(profile.id) : false;

  const handleSendMessage = async () => {
    if (!currentUser || !profile) return;

    // Check for existing conversation or create one
    const { data: existingConversations } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", currentUser.id);

    const conversationIds = existingConversations?.map(c => c.conversation_id) || [];

    if (conversationIds.length > 0) {
      const { data: sharedConvo } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", profile.id)
        .in("conversation_id", conversationIds)
        .limit(1)
        .maybeSingle();

      if (sharedConvo) {
        navigate(`/messages?conversation=${sharedConvo.conversation_id}`);
        return;
      }
    }

    // Create new conversation
    const { data: newConvo, error: convoError } = await supabase
      .from("conversations")
      .insert({ created_by: currentUser.id, is_group: false })
      .select()
      .single();

    if (convoError) {
      toast({ title: "Error", description: convoError.message, variant: "destructive" });
      return;
    }

    await supabase.from("conversation_participants").insert([
      { conversation_id: newConvo.id, user_id: currentUser.id },
      { conversation_id: newConvo.id, user_id: profile.id },
    ]);

    navigate(`/messages?conversation=${newConvo.id}`);
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-4xl mx-auto p-4">
          <Skeleton className="h-32 w-full mb-4" />
          <Skeleton className="h-96 w-full" />
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-4xl mx-auto p-4">
          <Card className="p-12 text-center">
            <UserIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">User not found</h2>
            <p className="text-muted-foreground">@{username} doesn't exist</p>
          </Card>
        </main>
      </div>
    );
  }

  // Show blocked state
  if (userBlockedMe && !isOwnProfile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-4xl mx-auto p-4">
          <Card className="p-12 text-center">
            <Ban className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">Content unavailable</h2>
            <p className="text-muted-foreground">This user's content is not available to you</p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-4xl mx-auto p-4 space-y-8">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row gap-8 mb-8">
          <Avatar className="h-32 w-32 mx-auto md:mx-0">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="text-4xl">
              {profile.username[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-4 mb-4">
              <h1 className="text-2xl font-semibold">@{profile.username}</h1>
              
              {isOwnProfile ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {!userIsBlocked && (
                    <>
                      <Button
                        variant={isFollowing ? "outline" : "default"}
                        size="sm"
                        onClick={() => followMutation.mutate()}
                        disabled={followMutation.isPending}
                      >
                        {isFollowing ? "Following" : "Follow"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSendMessage}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Message
                      </Button>
                    </>
                  )}
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Ban className="h-4 w-4 mr-2" />
                            {userIsBlocked ? "Unblock" : "Block"} @{username}
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {userIsBlocked ? "Unblock" : "Block"} @{username}?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {userIsBlocked
                                ? "They will be able to see your posts and follow you again."
                                : "They won't be able to see your posts, follow you, or message you. You won't see their content either."}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => userIsBlocked ? unblockUser(profile.id) : blockUser(profile.id)}
                              disabled={isBlocking || isUnblocking}
                            >
                              {userIsBlocked ? "Unblock" : "Block"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>

            <div className="flex gap-6 mb-4 justify-center md:justify-start">
              <div className="text-center md:text-left">
                <span className="font-semibold">{posts.length}</span>
                <span className="text-muted-foreground ml-1">posts</span>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <button className="hover:text-muted-foreground transition-colors">
                    <span className="font-semibold">{followersList.length}</span>
                    <span className="text-muted-foreground ml-1">followers</span>
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Followers</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="h-96">
                    {followersList.map((follower: any) => (
                      <div key={follower.id} className="flex items-center gap-3 p-3">
                        <Avatar>
                          <AvatarImage src={follower.avatar_url} />
                          <AvatarFallback>{follower.username[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold">@{follower.username}</div>
                          {follower.full_name && (
                            <div className="text-sm text-muted-foreground">{follower.full_name}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  <button className="hover:text-muted-foreground transition-colors">
                    <span className="font-semibold">{followingList.length}</span>
                    <span className="text-muted-foreground ml-1">following</span>
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Following</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="h-96">
                    {followingList.map((following: any) => (
                      <div key={following.id} className="flex items-center gap-3 p-3">
                        <Avatar>
                          <AvatarImage src={following.avatar_url} />
                          <AvatarFallback>{following.username[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold">@{following.username}</div>
                          {following.full_name && (
                            <div className="text-sm text-muted-foreground">{following.full_name}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </div>

            {profile.full_name && (
              <p className="font-semibold mb-1">{profile.full_name}</p>
            )}
            {profile.bio && (
              <p className="text-sm mb-2">{profile.bio}</p>
            )}
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                {profile.website}
              </a>
            )}
          </div>
        </div>

        {/* Highlight Manager */}
        {currentUser?.id === profile?.id && (
          <HighlightManager userId={profile.id} />
        )}

        {/* Tabs */}
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="posts">
              <Grid3X3 className="h-4 w-4 mr-2" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="reels">
              <Film className="h-4 w-4 mr-2" />
              Reels
            </TabsTrigger>
            <TabsTrigger value="saved">
              <Bookmark className="h-4 w-4 mr-2" />
              Saved
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-6">
            {posts.length === 0 ? (
              <Card className="p-12 text-center">
                <Grid3X3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No posts yet</p>
              </Card>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {posts.map((post: any) => (
                  <div key={post.id} className="aspect-square bg-muted overflow-hidden">
                    <img
                      src={post.media_urls?.[0]}
                      alt={post.caption || "Post"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reels">
            <Card className="p-12 text-center">
              <Film className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No reels yet</p>
            </Card>
          </TabsContent>

          <TabsContent value="saved">
            <Card className="p-12 text-center">
              <Bookmark className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No saved posts</p>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default UserProfile;
