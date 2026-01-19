-- Fix security issue: Profile RLS policy logic error
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles
FOR SELECT
USING (is_private = false AND is_banned = false);

-- Add explicit deny for unauthenticated users on conversations
CREATE POLICY "Deny anonymous access to conversations"
ON public.conversations
FOR SELECT
TO anon
USING (false);

-- Add polls table for Stories
CREATE TABLE public.story_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid REFERENCES public.stories(id) ON DELETE CASCADE NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL, -- Array of {text: string, votes: number}
  created_at timestamp with time zone DEFAULT now()
);

-- Add poll votes table
CREATE TABLE public.story_poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid REFERENCES public.story_polls(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  option_index integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- Add story stickers table
CREATE TABLE public.story_stickers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid REFERENCES public.stories(id) ON DELETE CASCADE NOT NULL,
  sticker_type text NOT NULL, -- 'emoji', 'gif', 'location', 'mention', 'time'
  sticker_data jsonb NOT NULL, -- Position, size, content
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.story_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_stickers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for story polls
CREATE POLICY "Users can view polls on stories they can see"
ON public.story_polls FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.stories
    WHERE id = story_polls.story_id
  )
);

CREATE POLICY "Story owners can create polls"
ON public.story_polls FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stories
    WHERE id = story_polls.story_id AND user_id = auth.uid()
  )
);

-- RLS Policies for poll votes
CREATE POLICY "Users can view poll votes"
ON public.story_poll_votes FOR SELECT USING (true);

CREATE POLICY "Users can vote on polls"
ON public.story_poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for stickers
CREATE POLICY "Users can view stickers on stories they can see"
ON public.story_stickers FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.stories
    WHERE id = story_stickers.story_id
  )
);

CREATE POLICY "Story owners can add stickers"
ON public.story_stickers FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.stories
    WHERE id = story_stickers.story_id AND user_id = auth.uid()
  )
);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Add notification preferences table
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  likes_enabled boolean DEFAULT true,
  comments_enabled boolean DEFAULT true,
  follows_enabled boolean DEFAULT true,
  mentions_enabled boolean DEFAULT true,
  tags_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification preferences"
ON public.notification_preferences FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
ON public.notification_preferences FOR ALL USING (auth.uid() = user_id);