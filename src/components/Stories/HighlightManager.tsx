import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Avatar } from "@/components/ui/avatar";

interface Highlight {
  id: string;
  name: string;
  cover_url: string | null;
  stories: { id: string; media_url: string }[];
}

export const HighlightManager = ({ userId }: { userId: string }) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingHighlight, setEditingHighlight] = useState<Highlight | null>(null);
  const [highlightName, setHighlightName] = useState("");
  const queryClient = useQueryClient();

  const { data: highlights = [] } = useQuery({
    queryKey: ["highlights", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("story_highlights")
        .select(`
          id,
          name,
          cover_url,
          story_highlight_items (
            story:stories (
              id,
              media_url
            )
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      return data.map(h => ({
        ...h,
        stories: h.story_highlight_items.map((item: any) => item.story)
      }));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("story_highlights")
        .insert({ name, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["highlights"] });
      setIsCreateOpen(false);
      setHighlightName("");
      toast({ title: "Highlight created" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, cover_url }: { id: string; name: string; cover_url?: string }) => {
      const updates: any = { name };
      if (cover_url) updates.cover_url = cover_url;

      const { error } = await supabase
        .from("story_highlights")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["highlights"] });
      setEditingHighlight(null);
      setHighlightName("");
      toast({ title: "Highlight updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("story_highlights")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["highlights"] });
      toast({ title: "Highlight deleted" });
    },
  });

  const handleCreate = () => {
    if (highlightName.trim()) {
      createMutation.mutate(highlightName);
    }
  };

  const handleUpdate = () => {
    if (editingHighlight && highlightName.trim()) {
      updateMutation.mutate({
        id: editingHighlight.id,
        name: highlightName,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Story Highlights</h3>
        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Highlight
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {highlights.map((highlight) => (
          <div key={highlight.id} className="space-y-2">
            <div className="relative aspect-square rounded-full overflow-hidden bg-muted border-2 border-primary">
              {highlight.cover_url ? (
                <img src={highlight.cover_url} alt={highlight.name} className="w-full h-full object-cover" />
              ) : highlight.stories[0] ? (
                <img src={highlight.stories[0].media_url} alt={highlight.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Plus className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>
            <p className="text-xs text-center truncate">{highlight.name}</p>
            <div className="flex gap-1 justify-center">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => {
                  setEditingHighlight(highlight);
                  setHighlightName(highlight.name);
                }}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => deleteMutation.mutate(highlight.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Highlight</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Highlight name"
              value={highlightName}
              onChange={(e) => setHighlightName(e.target.value)}
            />
            <Button onClick={handleCreate} className="w-full">
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingHighlight} onOpenChange={() => setEditingHighlight(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Highlight</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Highlight name"
              value={highlightName}
              onChange={(e) => setHighlightName(e.target.value)}
            />
            <Button onClick={handleUpdate} className="w-full">
              Update
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
