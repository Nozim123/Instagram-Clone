-- Create saved_collections table for organizing bookmarked posts
CREATE TABLE IF NOT EXISTS public.saved_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  cover_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_collections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for saved_collections
CREATE POLICY "Users can view their own collections"
ON public.saved_collections
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own collections"
ON public.saved_collections
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections"
ON public.saved_collections
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections"
ON public.saved_collections
FOR DELETE
USING (auth.uid() = user_id);

-- Add collection_id to saved_posts if it doesn't have proper linking
-- First check if we need to add foreign key
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'saved_posts' 
    AND column_name = 'collection_id'
  ) THEN
    ALTER TABLE public.saved_posts ADD COLUMN collection_id UUID REFERENCES public.saved_collections(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create trigger for updated_at
CREATE OR REPLACE TRIGGER update_saved_collections_updated_at
BEFORE UPDATE ON public.saved_collections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();