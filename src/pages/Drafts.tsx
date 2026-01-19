import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Edit2, Trash2, Send, Clock, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Draft {
  id: string;
  caption: string | null;
  media_urls: string[];
  media_type: string | null;
  location: string | null;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
}

const Drafts = () => {
  const [editingDraft, setEditingDraft] = useState<Draft | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const queryClient = useQueryClient();

  const { data: drafts, isLoading } = useQuery({
    queryKey: ["drafts"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await (supabase as any)
        .from("post_drafts")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as Draft[];
    },
  });

  const updateDraftMutation = useMutation({
    mutationFn: async ({ id, caption, scheduled_at }: { id: string; caption: string; scheduled_at: string | null }) => {
      const { error } = await (supabase as any)
        .from("post_drafts")
        .update({ caption, scheduled_at, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
      setEditingDraft(null);
      toast({ title: "Draft updated" });
    },
  });

  const deleteDraftMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("post_drafts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
      toast({ title: "Draft deleted" });
    },
  });

  const publishDraftMutation = useMutation({
    mutationFn: async (draft: Draft) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: postError } = await supabase.from("posts").insert({
        user_id: user.id,
        caption: draft.caption,
        media_urls: draft.media_urls,
        media_type: draft.media_type || "image",
        location: draft.location,
      });
      if (postError) throw postError;

      const { error: deleteError } = await (supabase as any)
        .from("post_drafts")
        .delete()
        .eq("id", draft.id);
      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast({ title: "Post published!" });
    },
  });

  const openEdit = (draft: Draft) => {
    setEditingDraft(draft);
    setEditCaption(draft.caption || "");
    setScheduledAt(draft.scheduled_at || "");
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Drafts</h1>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </Card>
          ))}
        </div>
      ) : drafts?.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No drafts yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Save posts as drafts to publish them later
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {drafts?.map((draft) => (
            <Card key={draft.id} className="p-4">
              <div className="flex gap-4">
                {draft.media_urls?.[0] && (
                  <img
                    src={draft.media_urls[0]}
                    alt="Draft media"
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm line-clamp-2">{draft.caption || "No caption"}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(draft.updated_at), { addSuffix: true })}
                    </span>
                    {draft.scheduled_at && (
                      <span className="flex items-center gap-1 text-accent">
                        <Calendar className="h-3 w-3" />
                        Scheduled
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit(draft)}
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => publishDraftMutation.mutate(draft)}
                  disabled={publishDraftMutation.isPending}
                >
                  <Send className="h-4 w-4 mr-1" />
                  Publish
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => deleteDraftMutation.mutate(draft.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editingDraft} onOpenChange={() => setEditingDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Draft</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Caption</Label>
              <Textarea
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>
            <div>
              <Label>Schedule (optional)</Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="mt-2"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingDraft(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (editingDraft) {
                    updateDraftMutation.mutate({
                      id: editingDraft.id,
                      caption: editCaption,
                      scheduled_at: scheduledAt || null,
                    });
                  }
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Drafts;