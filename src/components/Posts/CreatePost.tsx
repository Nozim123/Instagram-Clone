import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { PlusSquare, Image as ImageIcon, X } from 'lucide-react';

export const CreatePost = () => {
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  
  const queryClient = useQueryClient();
  const { uploadMedia, uploading, progress } = useMediaUpload('post-media');

  const createPostMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (selectedFiles.length === 0) {
        throw new Error('Please select at least one image or video');
      }

      // Upload media files
      const mediaUrls = await uploadMedia(selectedFiles);

      // Determine media type
      const hasVideo = selectedFiles.some(f => f.type.startsWith('video/'));
      const mediaType = hasVideo ? 'video' : 'image';

      // Create post
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          caption,
          location: location || null,
          media_urls: mediaUrls,
          media_type: mediaType
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast({
        title: 'Post created',
        description: 'Your post has been published successfully'
      });
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create post',
        variant: 'destructive'
      });
    }
  });

  const resetForm = () => {
    setCaption('');
    setLocation('');
    setSelectedFiles([]);
    setPreviewUrls([]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
    
    // Create preview URLs
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrls(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <PlusSquare className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Post</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="media">Photos/Videos</Label>
            <div className="mt-2">
              <label htmlFor="media" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-secondary/50">
                <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Click to upload media</span>
                <input
                  id="media"
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
            </div>

            {previewUrls.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img src={url} alt={`Preview ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
                    <button
                      onClick={() => removeFile(index)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="caption">Caption</Label>
            <Textarea
              id="caption"
              placeholder="Write a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={4}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="location">Location (optional)</Label>
            <Input
              id="location"
              placeholder="Add location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-2"
            />
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          <Button
            onClick={() => createPostMutation.mutate()}
            disabled={uploading || createPostMutation.isPending || selectedFiles.length === 0}
            className="w-full"
          >
            {uploading ? 'Uploading...' : createPostMutation.isPending ? 'Creating...' : 'Share Post'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
