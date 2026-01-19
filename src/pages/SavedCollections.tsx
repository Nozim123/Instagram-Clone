import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Folder, Trash2, Bookmark, ArrowLeft, Edit2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const SavedCollections = () => {
  const [newCollectionName, setNewCollectionName] = useState("");
  const [editingCollection, setEditingCollection] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: collections = [] } = useQuery({
    queryKey: ["saved-collections", currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];

      const { data, error } = await (supabase as any)
        .from("saved_collections")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!currentUser?.id,
  });

  const { data: savedPosts = [] } = useQuery({
    queryKey: ["saved-posts", currentUser?.id, selectedCollection],
    queryFn: async () => {
      if (!currentUser?.id) return [];

      let query = supabase
        .from("saved_posts")
        .select(`
          *,
          posts (
            id,
            media_urls,
            caption,
            likes_count
          )
        `)
        .eq("user_id", currentUser.id);

      if (selectedCollection) {
        query = query.eq("collection_name", selectedCollection);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!currentUser?.id,
  });

  const createCollectionMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!currentUser?.id) throw new Error("Not authenticated");

      const { error } = await (supabase as any)
        .from("saved_collections")
        .insert({
          user_id: currentUser.id,
          name,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-collections"] });
      setNewCollectionName("");
      setCreateDialogOpen(false);
      toast({ title: "Collection created!" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateCollectionMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await (supabase as any)
        .from("saved_collections")
        .update({ name })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-collections"] });
      setEditingCollection(null);
      toast({ title: "Collection updated!" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteCollectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("saved_collections")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-collections"] });
      toast({ title: "Collection deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const removeFromCollectionMutation = useMutation({
    mutationFn: async (savedPostId: string) => {
      const { error } = await supabase
        .from("saved_posts")
        .delete()
        .eq("id", savedPostId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-posts"] });
      toast({ title: "Removed from collection" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateCollection = () => {
    if (newCollectionName.trim()) {
      createCollectionMutation.mutate(newCollectionName.trim());
    }
  };

  const handleUpdateCollection = (id: string) => {
    if (editName.trim()) {
      updateCollectionMutation.mutate({ id, name: editName.trim() });
    }
  };

  if (selectedCollection !== null) {
    return (
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSelectedCollection(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{selectedCollection || "All Saved"}</h1>
        </div>

        {savedPosts.length === 0 ? (
          <Card className="p-12 text-center">
            <Bookmark className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No saved posts in this collection</p>
          </Card>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {savedPosts.map((saved: any) => (
              <div key={saved.id} className="aspect-square bg-muted overflow-hidden relative group">
                <img
                  src={saved.posts?.media_urls?.[0] || "/placeholder.svg"}
                  alt={saved.posts?.caption || "Saved post"}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={() => removeFromCollectionMutation.mutate(saved.id)}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Saved Collections</h1>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Collection
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Collection</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="Collection name..."
                onKeyDown={(e) => e.key === "Enter" && handleCreateCollection()}
              />
              <Button
                onClick={handleCreateCollection}
                disabled={createCollectionMutation.isPending || !newCollectionName.trim()}
                className="w-full"
              >
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* All Saved */}
      <Card
        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setSelectedCollection("")}
      >
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center">
            <Bookmark className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">All Saved</h3>
            <p className="text-sm text-muted-foreground">View all saved posts</p>
          </div>
        </div>
      </Card>

      {/* Collections Grid */}
      <div className="grid grid-cols-2 gap-4">
        {collections.map((collection: any) => (
          <Card key={collection.id} className="p-4 group relative">
            {editingCollection === collection.id ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUpdateCollection(collection.id)}
                  autoFocus
                />
                <Button size="sm" onClick={() => handleUpdateCollection(collection.id)}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingCollection(null)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div
                className="flex items-center gap-4 cursor-pointer"
                onClick={() => setSelectedCollection(collection.name)}
              >
                <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center">
                  <Folder className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{collection.name}</h3>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingCollection(collection.id);
                      setEditName(collection.name);
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCollectionMutation.mutate(collection.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SavedCollections;
