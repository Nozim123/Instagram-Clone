import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useMediaUpload = (bucket: 'post-media' | 'message-media' = 'post-media') => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadMedia = async (files: File[]): Promise<string[]> => {
    setUploading(true);
    setProgress(0);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const uploadedUrls: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(data.path);

        uploadedUrls.push(publicUrl);
        setProgress(((i + 1) / files.length) * 100);
      }

      return uploadedUrls;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload media',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return { uploadMedia, uploading, progress };
};
