-- Add shared content references to messages table for DM sharing
ALTER TABLE public.messages 
ADD COLUMN shared_post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
ADD COLUMN shared_reel_id uuid REFERENCES public.reels(id) ON DELETE SET NULL,
ADD COLUMN shared_story_id uuid REFERENCES public.stories(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_messages_shared_content ON public.messages(shared_post_id, shared_reel_id, shared_story_id);

-- Update message_type to include 'shared_content'
COMMENT ON COLUMN public.messages.message_type IS 'text, image, video, voice, file, shared_content';