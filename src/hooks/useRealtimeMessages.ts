import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: string;
  media_urls: string[] | null;
  reply_to_id: string | null;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
};

export const useRealtimeMessages = (conversationId: string) => {
  const queryClient = useQueryClient();
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles(username, avatar_url)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!conversationId
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'typing_indicators',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload: any) => {
          setTypingUsers(prev => new Set(prev).add(payload.new.user_id));
          
          // Auto-remove after 3 seconds
          setTimeout(() => {
            setTypingUsers(prev => {
              const next = new Set(prev);
              next.delete(payload.new.user_id);
              return next;
            });
          }, 3000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, mediaUrls, replyToId }: { 
      content?: string;
      mediaUrls?: string[];
      replyToId?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const messageType = mediaUrls && mediaUrls.length > 0 ? 'media' : 'text';

      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content || null,
          media_urls: mediaUrls || null,
          message_type: messageType,
          reply_to_id: replyToId || null
        });

      if (error) throw error;
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive'
      });
    }
  });

  const setTypingIndicator = async (isTyping: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (isTyping) {
      await supabase
        .from('typing_indicators')
        .upsert({
          conversation_id: conversationId,
          user_id: user.id
        });
    } else {
      await supabase
        .from('typing_indicators')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);
    }
  };

  const markAsRead = async (messageId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('message_read_receipts')
      .upsert({
        message_id: messageId,
        user_id: user.id
      });
  };

  return {
    messages,
    isLoading,
    sendMessage: sendMessageMutation.mutate,
    isSending: sendMessageMutation.isPending,
    typingUsers: Array.from(typingUsers),
    setTypingIndicator,
    markAsRead
  };
};
