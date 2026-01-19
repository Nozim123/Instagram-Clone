import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface UploadProgress {
  progress: number;
  stage: 'compressing' | 'uploading' | 'processing' | 'complete';
}

export const useVideoUpload = (bucket: 'reels' | 'stories' = 'reels') => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    progress: 0,
    stage: 'compressing',
  });

  const generateThumbnail = async (videoFile: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      video.onloadeddata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        video.currentTime = 1; // Capture at 1 second
      };

      video.onseeked = () => {
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Could not generate thumbnail'));
          }
        }, 'image/jpeg', 0.8);
      };

      video.onerror = () => reject(new Error('Could not load video'));
      video.src = URL.createObjectURL(videoFile);
    });
  };

  const compressVideo = async (file: File): Promise<File> => {
    // In a production app, you'd use FFmpeg or a similar library
    // For now, we'll return the original file
    // This is where you'd implement video compression
    return file;
  };

  const uploadVideo = async (file: File): Promise<{ videoUrl: string; thumbnailUrl: string; duration: number }> => {
    setUploading(true);
    setUploadProgress({ progress: 10, stage: 'compressing' });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Compress video
      const compressedVideo = await compressVideo(file);
      setUploadProgress({ progress: 30, stage: 'uploading' });

      // Upload video
      const videoExt = file.name.split('.').pop();
      const videoFileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${videoExt}`;

      const { data: videoData, error: videoError } = await supabase.storage
        .from(bucket)
        .upload(videoFileName, compressedVideo, {
          cacheControl: '3600',
          upsert: false
        });

      if (videoError) throw videoError;

      const { data: { publicUrl: videoUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(videoData.path);

      setUploadProgress({ progress: 60, stage: 'processing' });

      // Generate and upload thumbnail
      const thumbnailBlob = await generateThumbnail(file);
      const thumbnailFileName = `${user.id}/${Date.now()}-thumb.jpg`;

      const { data: thumbData, error: thumbError } = await supabase.storage
        .from(bucket)
        .upload(thumbnailFileName, thumbnailBlob, {
          cacheControl: '3600',
          upsert: false
        });

      if (thumbError) throw thumbError;

      const { data: { publicUrl: thumbnailUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(thumbData.path);

      // Get video duration
      const duration = await new Promise<number>((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          resolve(Math.floor(video.duration));
          URL.revokeObjectURL(video.src);
        };
        video.src = URL.createObjectURL(file);
      });

      setUploadProgress({ progress: 100, stage: 'complete' });

      return { videoUrl, thumbnailUrl, duration };
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload video',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setUploading(false);
      setTimeout(() => {
        setUploadProgress({ progress: 0, stage: 'compressing' });
      }, 1000);
    }
  };

  return { uploadVideo, uploading, uploadProgress };
};
