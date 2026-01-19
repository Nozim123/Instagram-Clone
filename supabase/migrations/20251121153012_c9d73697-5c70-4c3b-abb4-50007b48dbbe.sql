-- ====================================
-- 1. ROLE-BASED ACCESS CONTROL SYSTEM
-- ====================================

-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('user', 'moderator', 'admin');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Anyone can view roles"
  ON public.user_roles FOR SELECT
  USING (true);

CREATE POLICY "Only admins can assign roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can remove roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- ====================================
-- 2. ENHANCED POSTS SYSTEM
-- ====================================

-- Add new columns to posts table for enhanced features
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS tagged_users UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Create post_insights table for analytics
CREATE TABLE public.post_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2) DEFAULT 0,
  UNIQUE(post_id, date)
);

ALTER TABLE public.post_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view insights for own posts"
  ON public.post_insights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.posts
      WHERE posts.id = post_insights.post_id
        AND posts.user_id = auth.uid()
    )
  );

-- Update comments table for nested replies
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS replies_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- Create function to update replies count
CREATE OR REPLACE FUNCTION public.update_replies_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_comment_id IS NOT NULL THEN
    UPDATE public.comments 
    SET replies_count = replies_count + 1 
    WHERE id = NEW.parent_comment_id;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_comment_id IS NOT NULL THEN
    UPDATE public.comments 
    SET replies_count = GREATEST(0, replies_count - 1)
    WHERE id = OLD.parent_comment_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_replies_count_trigger
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_replies_count();

-- ====================================
-- 3. REAL-TIME MESSAGING SYSTEM
-- ====================================

-- Create conversations table
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  is_group BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Create conversation_participants table
CREATE TABLE public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  is_muted BOOLEAN DEFAULT false,
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',
  media_urls TEXT[],
  reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create message_read_receipts table
CREATE TABLE public.message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;

-- Create typing_indicators table
CREATE TABLE public.typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Conversations
CREATE POLICY "Users can view conversations they're part of"
  ON public.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
        AND conversation_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admins can update conversations"
  ON public.conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
        AND conversation_participants.user_id = auth.uid()
        AND conversation_participants.role IN ('admin', 'creator')
    )
  );

-- RLS Policies for Conversation Participants
CREATE POLICY "Users can view participants in their conversations"
  ON public.conversation_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants AS cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join conversations they're added to"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (
    -- Either they're the one being added or they're an admin adding someone
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.conversation_participants AS cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
        AND cp.role IN ('admin', 'creator')
    )
  );

CREATE POLICY "Users can leave conversations"
  ON public.conversation_participants FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own participant settings"
  ON public.conversation_participants FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for Messages
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
        AND conversation_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
        AND conversation_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can edit own messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete own messages"
  ON public.messages FOR DELETE
  USING (auth.uid() = sender_id);

-- RLS Policies for Read Receipts
CREATE POLICY "Users can view read receipts in their conversations"
  ON public.message_read_receipts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages
      JOIN public.conversation_participants ON conversation_participants.conversation_id = messages.conversation_id
      WHERE messages.id = message_read_receipts.message_id
        AND conversation_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own read receipts"
  ON public.message_read_receipts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Typing Indicators
CREATE POLICY "Users can view typing indicators in their conversations"
  ON public.typing_indicators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_participants.conversation_id = typing_indicators.conversation_id
        AND conversation_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own typing indicators"
  ON public.typing_indicators FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own typing indicators"
  ON public.typing_indicators FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update conversation timestamp
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET 
    updated_at = NOW(),
    last_message_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_conversation_timestamp_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_timestamp();

-- Enable realtime for messaging tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_read_receipts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- ====================================
-- 4. STORAGE BUCKETS
-- ====================================

-- Create storage buckets for media
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('post-media', 'post-media', true),
  ('message-media', 'message-media', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for post-media bucket
CREATE POLICY "Anyone can view post media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-media');

CREATE POLICY "Authenticated users can upload post media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post-media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own post media"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'post-media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own post media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'post-media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for message-media bucket
CREATE POLICY "Users can view message media in their conversations"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'message-media' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users can upload message media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'message-media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own message media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'message-media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create indexes for performance
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
CREATE INDEX idx_posts_tagged_users ON public.posts USING GIN(tagged_users);
CREATE INDEX idx_post_insights_post_id ON public.post_insights(post_id);
CREATE INDEX idx_post_insights_date ON public.post_insights(date);
CREATE INDEX idx_conversation_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_conversation_id ON public.conversation_participants(conversation_id);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_typing_indicators_conversation_id ON public.typing_indicators(conversation_id);
CREATE INDEX idx_message_read_receipts_message_id ON public.message_read_receipts(message_id);