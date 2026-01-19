import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVideoUpload } from "@/hooks/useVideoUpload";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { PlusCircle, Upload, Type, Smile, BarChart3, MapPin, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export const CreateStory = () => {
  const [open, setOpen] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>("");
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [textOverlay, setTextOverlay] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [stickers, setStickers] = useState<Array<{ type: string; data: any }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { uploadVideo, uploading } = useVideoUpload('stories');

  const createStoryMutation = useMutation({
    mutationFn: async () => {
      if (!mediaFile) throw new Error("No media selected");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let mediaUrl: string;
      let duration = 5;

      if (mediaType === 'video') {
        const result = await uploadVideo(mediaFile);
        mediaUrl = result.videoUrl;
        duration = result.duration;
      } else {
        // Upload image
        const fileExt = mediaFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('stories')
          .upload(fileName, mediaFile);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('stories')
          .getPublicUrl(data.path);
        
        mediaUrl = publicUrl;
      }

      // Create story
      const { data: story, error: storyError } = await supabase
        .from("stories")
        .insert({
          user_id: user.id,
          media_url: mediaUrl,
          media_type: mediaType,
          duration,
        })
        .select()
        .single();

      if (storyError) throw storyError;

      // Add text sticker if present
      if (textOverlay) {
        await supabase.from("story_stickers").insert({
          story_id: story.id,
          sticker_type: 'text',
          sticker_data: { text: textOverlay, x: 50, y: 50, size: 24 },
        });
      }

      // Add poll if present
      if (pollQuestion && pollOptions.every(opt => opt.trim())) {
        await supabase.from("story_polls").insert({
          story_id: story.id,
          question: pollQuestion,
          options: pollOptions.map(text => ({ text, votes: 0 })),
        });
      }

      // Add other stickers
      if (stickers.length > 0) {
        await supabase.from("story_stickers").insert(
          stickers.map(sticker => ({
            story_id: story.id,
            sticker_type: sticker.type,
            sticker_data: sticker.data,
          }))
        );
      }
    },
    onSuccess: () => {
      toast({ title: "Story posted!", description: "Your story is now live" });
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error posting story",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setMediaFile(null);
    setMediaPreview("");
    setTextOverlay("");
    setPollQuestion("");
    setPollOptions(["", ""]);
    setStickers([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if (!isImage && !isVideo) {
        toast({ title: "Invalid file", description: "Please select an image or video", variant: "destructive" });
        return;
      }

      setMediaType(isImage ? 'image' : 'video');
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const addPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, ""]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full">
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Story
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Story</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Preview */}
          <div className="space-y-4">
            {!mediaFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="aspect-[9/16] border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors"
              >
                <Upload className="h-12 w-12 mb-4 text-muted-foreground" />
                <p className="font-medium mb-2">Upload Photo or Video</p>
                <p className="text-sm text-muted-foreground text-center">
                  Click to browse or drag and drop
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            ) : (
              <div className="aspect-[9/16] bg-black rounded-lg overflow-hidden relative">
                {mediaType === 'image' ? (
                  <img src={mediaPreview} alt="Story" className="w-full h-full object-contain" />
                ) : (
                  <video src={mediaPreview} controls className="w-full h-full object-contain" />
                )}
                
                {textOverlay && (
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-2xl font-bold text-center px-4">
                    {textOverlay}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {mediaFile && (
              <Tabs defaultValue="text">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="text">
                    <Type className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="stickers">
                    <Smile className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="poll">
                    <BarChart3 className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="location">
                    <MapPin className="h-4 w-4" />
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="space-y-3">
                  <label className="text-sm font-medium">Add Text</label>
                  <Textarea
                    value={textOverlay}
                    onChange={(e) => setTextOverlay(e.target.value)}
                    placeholder="Type your text..."
                    maxLength={100}
                  />
                </TabsContent>

                <TabsContent value="stickers" className="space-y-3">
                  <label className="text-sm font-medium">Add Stickers</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['😀', '😍', '🔥', '❤️', '👍', '🎉', '✨', '💯'].map(emoji => (
                      <Button
                        key={emoji}
                        variant="outline"
                        className="text-2xl"
                        onClick={() => setStickers([...stickers, { type: 'emoji', data: { emoji, x: 50, y: 30 } }])}
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="poll" className="space-y-3">
                  <label className="text-sm font-medium">Create Poll</label>
                  <Input
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    placeholder="Ask a question..."
                    maxLength={100}
                  />
                  {pollOptions.map((option, index) => (
                    <Input
                      key={index}
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...pollOptions];
                        newOptions[index] = e.target.value;
                        setPollOptions(newOptions);
                      }}
                      placeholder={`Option ${index + 1}`}
                      maxLength={50}
                    />
                  ))}
                  {pollOptions.length < 4 && (
                    <Button variant="outline" size="sm" onClick={addPollOption}>
                      Add Option
                    </Button>
                  )}
                </TabsContent>

                <TabsContent value="location" className="space-y-3">
                  <label className="text-sm font-medium">Add Location</label>
                  <Input placeholder="Search locations..." />
                  <p className="text-sm text-muted-foreground">Coming soon</p>
                </TabsContent>
              </Tabs>
            )}

            {mediaFile && (
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  disabled={uploading || createStoryMutation.isPending}
                >
                  Change Media
                </Button>
                <Button
                  onClick={() => createStoryMutation.mutate()}
                  disabled={uploading || createStoryMutation.isPending}
                  className="flex-1"
                >
                  {uploading || createStoryMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    'Share to Story'
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
