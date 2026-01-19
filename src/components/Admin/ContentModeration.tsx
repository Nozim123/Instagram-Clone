import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { AlertTriangle, CheckCircle, XCircle, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const ContentModeration = () => {
  const queryClient = useQueryClient();

  const { data: reportedPosts } = useQuery({
    queryKey: ['reportedPosts'],
    queryFn: async () => {
      // In a real app, you'd have a reports table
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles(username, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    }
  });

  const { data: reportedComments } = useQuery({
    queryKey: ['reportedComments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles(username),
          posts(caption)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    }
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportedPosts'] });
      toast({
        title: 'Post deleted',
        description: 'The post has been removed'
      });
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportedComments'] });
      toast({
        title: 'Comment deleted',
        description: 'The comment has been removed'
      });
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Moderation Queue</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="posts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="posts">
              Posts {reportedPosts && `(${reportedPosts.length})`}
            </TabsTrigger>
            <TabsTrigger value="comments">
              Comments {reportedComments && `(${reportedComments.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-4">
            {reportedPosts && reportedPosts.length > 0 ? (
              reportedPosts.map((post) => (
                <div key={post.id} className="p-4 bg-secondary rounded-lg space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      {post.media_urls?.[0] && (
                        <img 
                          src={post.media_urls[0]} 
                          alt="Post" 
                          className="w-20 h-20 object-cover rounded"
                        />
                      )}
                      <div>
                        <p className="font-medium">@{post.profiles?.username || 'unknown'}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {post.caption || 'No caption'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => deletePostMutation.mutate(post.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                      <Button variant="ghost" size="sm">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-8 text-muted-foreground">No posts to review</p>
            )}
          </TabsContent>

          <TabsContent value="comments" className="space-y-4">
            {reportedComments && reportedComments.length > 0 ? (
              reportedComments.map((comment) => (
                <div key={comment.id} className="p-4 bg-secondary rounded-lg space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">@{comment.profiles?.username || 'unknown'}</p>
                      <p className="text-sm mt-1">{comment.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        On post: {comment.posts?.caption?.substring(0, 50) || 'No caption'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => deleteCommentMutation.mutate(comment.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                      <Button variant="ghost" size="sm">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-8 text-muted-foreground">No comments to review</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
