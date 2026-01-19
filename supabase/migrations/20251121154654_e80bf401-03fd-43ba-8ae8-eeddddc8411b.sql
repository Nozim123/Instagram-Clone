-- Fix security issue: Restrict profile access based on privacy settings
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create new policies that respect privacy settings
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles
FOR SELECT
USING (is_private = false OR is_banned = false);

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can view profiles they follow (if private)"
ON public.profiles
FOR SELECT
USING (
  is_private = true AND 
  EXISTS (
    SELECT 1 FROM public.follows
    WHERE following_id = profiles.id 
    AND follower_id = auth.uid()
    AND status = 'accepted'
  )
);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Fix security issue: Restrict user_roles visibility
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view roles" ON public.user_roles;

-- Create restrictive policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create interests table for onboarding
CREATE TABLE public.interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text NOT NULL,
  icon text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create user_interests junction table
CREATE TABLE public.user_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  interest_id uuid REFERENCES public.interests(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, interest_id)
);

-- Enable RLS
ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;

-- Interests are viewable by everyone
CREATE POLICY "Interests are viewable by everyone"
ON public.interests
FOR SELECT
USING (true);

-- Users can view all user interests (for suggestions)
CREATE POLICY "User interests are viewable by everyone"
ON public.user_interests
FOR SELECT
USING (true);

-- Users can manage their own interests
CREATE POLICY "Users can insert their own interests"
ON public.user_interests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interests"
ON public.user_interests
FOR DELETE
USING (auth.uid() = user_id);

-- Create reels table
CREATE TABLE public.reels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_url text NOT NULL,
  thumbnail_url text,
  caption text,
  music_id uuid,
  music_name text,
  duration integer NOT NULL,
  views_count integer DEFAULT 0,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create reel_likes table
CREATE TABLE public.reel_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reel_id uuid REFERENCES public.reels(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, reel_id)
);

-- Create reel_comments table
CREATE TABLE public.reel_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reel_id uuid REFERENCES public.reels(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  likes_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create stories table
CREATE TABLE public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  media_url text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  duration integer DEFAULT 5,
  views_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '24 hours')
);

-- Create story_views table
CREATE TABLE public.story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid REFERENCES public.stories(id) ON DELETE CASCADE NOT NULL,
  viewer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  viewed_at timestamp with time zone DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

-- Create story_highlights table
CREATE TABLE public.story_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  cover_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create story_highlight_items junction table
CREATE TABLE public.story_highlight_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  highlight_id uuid REFERENCES public.story_highlights(id) ON DELETE CASCADE NOT NULL,
  story_id uuid REFERENCES public.stories(id) ON DELETE CASCADE NOT NULL,
  added_at timestamp with time zone DEFAULT now(),
  UNIQUE(highlight_id, story_id)
);

-- Add onboarding_completed flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Enable RLS on new tables
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_highlight_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Reels
CREATE POLICY "Reels are viewable by everyone"
ON public.reels FOR SELECT USING (true);

CREATE POLICY "Users can create their own reels"
ON public.reels FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reels"
ON public.reels FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reels"
ON public.reels FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for Reel Likes
CREATE POLICY "Reel likes are viewable by everyone"
ON public.reel_likes FOR SELECT USING (true);

CREATE POLICY "Users can like reels"
ON public.reel_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike reels"
ON public.reel_likes FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for Reel Comments
CREATE POLICY "Reel comments are viewable by everyone"
ON public.reel_comments FOR SELECT USING (true);

CREATE POLICY "Users can comment on reels"
ON public.reel_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reel comments"
ON public.reel_comments FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reel comments"
ON public.reel_comments FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for Stories
CREATE POLICY "Users can view their own stories"
ON public.stories FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view stories from accounts they follow"
ON public.stories FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.follows
    WHERE following_id = stories.user_id 
    AND follower_id = auth.uid()
    AND status = 'accepted'
  ) AND expires_at > now()
);

CREATE POLICY "Users can view stories from public accounts"
ON public.stories FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = stories.user_id 
    AND is_private = false
  ) AND expires_at > now()
);

CREATE POLICY "Users can create their own stories"
ON public.stories FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories"
ON public.stories FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for Story Views
CREATE POLICY "Story views are viewable by story owners"
ON public.story_views FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.stories
    WHERE id = story_views.story_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can record story views"
ON public.story_views FOR INSERT WITH CHECK (auth.uid() = viewer_id);

-- RLS Policies for Story Highlights
CREATE POLICY "Highlights are viewable based on profile privacy"
ON public.story_highlights FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = story_highlights.user_id 
    AND is_private = false
  ) OR
  EXISTS (
    SELECT 1 FROM public.follows
    WHERE following_id = story_highlights.user_id 
    AND follower_id = auth.uid()
    AND status = 'accepted'
  )
);

CREATE POLICY "Users can manage their own highlights"
ON public.story_highlights FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their highlight items"
ON public.story_highlight_items FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.story_highlights
    WHERE id = story_highlight_items.highlight_id 
    AND user_id = auth.uid()
  )
);

-- Create triggers for maintaining counts
CREATE OR REPLACE FUNCTION update_reel_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.reels SET likes_count = likes_count + 1 WHERE id = NEW.reel_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.reels SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.reel_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_reel_likes_count_trigger
AFTER INSERT OR DELETE ON public.reel_likes
FOR EACH ROW EXECUTE FUNCTION update_reel_likes_count();

CREATE OR REPLACE FUNCTION update_reel_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.reels SET comments_count = comments_count + 1 WHERE id = NEW.reel_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.reels SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.reel_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_reel_comments_count_trigger
AFTER INSERT OR DELETE ON public.reel_comments
FOR EACH ROW EXECUTE FUNCTION update_reel_comments_count();

CREATE OR REPLACE FUNCTION update_story_views_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.stories SET views_count = views_count + 1 WHERE id = NEW.story_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_story_views_count_trigger
AFTER INSERT ON public.story_views
FOR EACH ROW EXECUTE FUNCTION update_story_views_count();

-- Insert default interests
INSERT INTO public.interests (name, category, icon) VALUES
('Photography', 'Creative', '📸'),
('Travel', 'Lifestyle', '✈️'),
('Food', 'Lifestyle', '🍔'),
('Fashion', 'Style', '👗'),
('Fitness', 'Health', '💪'),
('Music', 'Creative', '🎵'),
('Art', 'Creative', '🎨'),
('Technology', 'Tech', '💻'),
('Gaming', 'Entertainment', '🎮'),
('Sports', 'Activity', '⚽'),
('Nature', 'Outdoors', '🌿'),
('Pets', 'Animals', '🐾'),
('Books', 'Education', '📚'),
('Movies', 'Entertainment', '🎬'),
('Comedy', 'Entertainment', '😂'),
('Beauty', 'Style', '💄'),
('Business', 'Career', '💼'),
('Science', 'Education', '🔬'),
('DIY', 'Creative', '🔨'),
('Cooking', 'Lifestyle', '👨‍🍳');

-- Create storage bucket for reels
INSERT INTO storage.buckets (id, name, public) 
VALUES ('reels', 'reels', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for stories
INSERT INTO storage.buckets (id, name, public) 
VALUES ('stories', 'stories', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for reels
CREATE POLICY "Anyone can view reels"
ON storage.objects FOR SELECT
USING (bucket_id = 'reels');

CREATE POLICY "Authenticated users can upload reels"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'reels' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own reels"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'reels' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own reels"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'reels' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for stories
CREATE POLICY "Anyone can view stories"
ON storage.objects FOR SELECT
USING (bucket_id = 'stories');

CREATE POLICY "Authenticated users can upload stories"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'stories' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own stories"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'stories' AND
  auth.uid()::text = (storage.foldername(name))[1]
);