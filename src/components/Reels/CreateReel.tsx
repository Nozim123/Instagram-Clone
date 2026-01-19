import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useVideoUpload } from "@/hooks/useVideoUpload";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Upload, Loader2 } from "lucide-react";
import { VideoEditor } from "./VideoEditor";

interface CreateReelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateReel = ({ open, onOpenChange }: CreateReelProps) => {
  const [caption, setCaption] = useState("");
  const [musicName, setMusicName] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editedVideo, setEditedVideo] = useState<{ blob: Blob; duration: number } | null>(null);
  const { uploadVideo, uploading, uploadProgress } = useVideoUpload("reels");
  const queryClient = useQueryClient();

  const createReel = useMutation({
    mutationFn: async ({ videoUrl, thumbnailUrl, duration }: { videoUrl: string; thumbnailUrl: string; duration: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("reels").insert({
        user_id: user.id,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        caption: caption || null,
        music_name: musicName || null,
        duration,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Reel created!" });
      queryClient.invalidateQueries({ queryKey: ["reels"] });
      onOpenChange(false);
      setCaption("");
      setMusicName("");
      setVideoFile(null);
      setEditedVideo(null);
      setShowEditor(false);
    },
    onError: (error) => {
      toast({
        title: "Error creating reel",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("video/")) {
      setVideoFile(file);
      setShowEditor(true);
    } else {
      toast({
        title: "Invalid file",
        description: "Please select a video file",
        variant: "destructive",
      });
    }
  };

  const handleEditorSave = (blob: Blob, duration: number) => {
    setEditedVideo({ blob, duration });
    setShowEditor(false);
  };

  const handleSubmit = async () => {
    if (!editedVideo) {
      toast({
        title: "No video edited",
        description: "Please edit your video first",
        variant: "destructive",
      });
      return;
    }

    try {
      const file = new File([editedVideo.blob], videoFile?.name || "reel.mp4", {
        type: "video/mp4",
      });
      
      const { videoUrl, thumbnailUrl } = await uploadVideo(file);
      await createReel.mutateAsync({ 
        videoUrl, 
        thumbnailUrl, 
        duration: editedVideo.duration 
      });
    } catch (error) {
      console.error("Error creating reel:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Reel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {showEditor && videoFile ? (
            <VideoEditor
              videoFile={videoFile}
              onSave={handleEditorSave}
              onCancel={() => {
                setShowEditor(false);
                setVideoFile(null);
              }}
            />
          ) : !videoFile ? (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
                id="video-upload"
              />
              <label htmlFor="video-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to upload video
                </p>
              </label>
            </div>
          ) : (
            <>
              <Textarea
                placeholder="Write a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
              />

              <Input
                placeholder="Add music name (optional)"
                value={musicName}
                onChange={(e) => setMusicName(e.target.value)}
              />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setVideoFile(null);
                    setEditedVideo(null);
                  }}
                  className="flex-1"
                >
                  Change Video
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={uploading}
                  className="flex-1"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {uploadProgress.stage === "compressing" && "Compressing..."}
                      {uploadProgress.stage === "uploading" && `${uploadProgress.progress}%`}
                      {uploadProgress.stage === "processing" && "Processing..."}
                    </>
                  ) : (
                    "Post"
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
