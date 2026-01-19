import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { Send, Paperclip, Image, Smile, ArrowLeft } from 'lucide-react';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

const Messages = () => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const { uploadMedia, uploading } = useMediaUpload('message-media');

  const { data: currentUser } = useQuery({
    queryKey: ['current-user-messages'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations!inner(
            id,
            name,
            is_group,
            last_message_at,
            conversation_participants!inner(
              profiles(
                id,
                username,
                avatar_url
              )
            )
          )
        `)
        .eq('user_id', user.id)
        .order('conversations(last_message_at)', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const {
    messages,
    sendMessage,
    isSending,
    typingUsers,
    setTypingIndicator,
  } = useRealtimeMessages(selectedConversation || '');

  const handleSendMessage = async () => {
    if (!messageText.trim() && !uploading) return;
    
    await sendMessage({ content: messageText });
    setMessageText('');
    setIsTyping(false);
    setTypingIndicator(false);
  };

  const handleTyping = (value: string) => {
    setMessageText(value);
    
    if (value && !isTyping) {
      setIsTyping(true);
      setTypingIndicator(true);
    } else if (!value && isTyping) {
      setIsTyping(false);
      setTypingIndicator(false);
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const urls = await uploadMedia(files);
    await sendMessage({ mediaUrls: urls });
  };

  const selectedConv = conversations?.find(c => c.conversation_id === selectedConversation);
  const otherUser = selectedConv?.conversations.conversation_participants
    .find((p: any) => p.profiles?.id !== currentUser?.id)?.profiles;

  return (
    <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-3.5rem)] flex">
      {/* Conversations List - Hidden on mobile when conversation is selected */}
      <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-border`}>
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Messages</h2>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2">
            {conversations?.map((conv) => {
              const conversation = conv.conversations;
              const other = conversation.conversation_participants
                .find((p: any) => p.profiles?.id !== currentUser?.id)?.profiles;
              
              return (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation.id)}
                  className={`w-full p-3 rounded-xl text-left hover:bg-secondary transition-colors ${
                    selectedConversation === conversation.id ? 'bg-secondary' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={other?.avatar_url || undefined} />
                      <AvatarFallback>{other?.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {conversation.name || other?.username || 'Unknown'}
                      </p>
                      {conversation.last_message_at && (
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            {(!conversations || conversations.length === 0) && (
              <p className="text-center text-muted-foreground py-8">No conversations yet</p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Messages Area */}
      <div className={`${selectedConversation ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSelectedConversation(null)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Avatar className="h-10 w-10">
                <AvatarImage src={otherUser?.avatar_url || undefined} />
                <AvatarFallback>{otherUser?.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{otherUser?.username || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground">Active now</p>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages?.map((message) => {
                  const isOwn = message.sender_id === currentUser?.id;
                  
                  return (
                    <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] ${isOwn ? 'bg-accent text-accent-foreground' : 'bg-secondary'} rounded-2xl px-4 py-2`}>
                        {message.media_urls && message.media_urls.length > 0 && (
                          <div className="mb-2 space-y-2">
                            {message.media_urls.map((url, i) => (
                              <img key={i} src={url} alt="Media" className="rounded-lg max-w-full" />
                            ))}
                          </div>
                        )}
                        {message.content && <p className="text-sm">{message.content}</p>}
                        <p className="text-[10px] opacity-70 mt-1">
                          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {typingUsers.length > 0 && (
                  <div className="flex justify-start">
                    <div className="bg-secondary rounded-2xl px-4 py-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-2 bg-secondary rounded-full px-4 py-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <Smile className="h-5 w-5" />
                </Button>
                
                <Input
                  value={messageText}
                  onChange={(e) => handleTyping(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="Message..."
                  className="flex-1 border-0 bg-transparent focus-visible:ring-0 px-0"
                />
                
                <label htmlFor="media-upload" className="cursor-pointer">
                  <Image className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
                </label>
                <input
                  id="media-upload"
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleMediaUpload}
                />
                
                {messageText.trim() && (
                  <Button
                    onClick={handleSendMessage}
                    disabled={isSending || uploading}
                    size="sm"
                    className="rounded-full"
                  >
                    Send
                  </Button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
            <div className="w-20 h-20 border-2 border-current rounded-full flex items-center justify-center mb-4">
              <Send className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Your Messages</h3>
            <p className="text-center text-sm">Send private messages to friends</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;