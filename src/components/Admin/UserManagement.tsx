import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Ban, Volume2, VolumeX, Trash2, Search } from 'lucide-react';

export const UserManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['users', searchTerm, roleFilter],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select(`
          *,
          user_roles(role)
        `)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      let filtered = data;
      if (roleFilter !== 'all') {
        filtered = data.filter(user => 
          user.user_roles?.some((r: any) => r.role === roleFilter)
        );
      }

      return filtered;
    }
  });

  const banUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Using type assertion since types haven't regenerated yet
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_banned: true,
          banned_at: new Date().toISOString()
        } as any)
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'User banned',
        description: 'User has been banned from the platform'
      });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'User deleted',
        description: 'User account has been permanently deleted',
        variant: 'destructive'
      });
    }
  });

  const getRoleBadge = (userRoles: any[]) => {
    if (!userRoles || userRoles.length === 0) return 'user';
    const roles = userRoles.map((r: any) => r.role);
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('moderator')) return 'moderator';
    return 'user';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="moderator">Moderators</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Loading users...</p>
            ) : users && users.length > 0 ? (
              users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>{user.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{user.username}</p>
                        <Badge variant={
                          getRoleBadge(user.user_roles) === 'admin' ? 'destructive' :
                          getRoleBadge(user.user_roles) === 'moderator' ? 'default' : 'secondary'
                        }>
                          {getRoleBadge(user.user_roles)}
                        </Badge>
                      </div>
                      {user.full_name && (
                        <p className="text-sm text-muted-foreground">{user.full_name}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => banUserMutation.mutate(user.id)}
                      disabled={banUserMutation.isPending}
                    >
                      <Ban className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteUserMutation.mutate(user.id)}
                      disabled={deleteUserMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-8 text-muted-foreground">No users found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
