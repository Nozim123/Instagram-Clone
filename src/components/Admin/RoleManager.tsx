import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Shield, UserCog, User } from 'lucide-react';

type AppRole = 'user' | 'moderator' | 'admin';

export const RoleManager = () => {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<AppRole>('user');
  const queryClient = useQueryClient();

  const { data: profiles } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name')
        .order('username');
      if (error) throw error;
      return data;
    }
  });

  const { data: userRoles } = useQuery({
    queryKey: ['allUserRoles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          id,
          user_id,
          role,
          assigned_at,
          profiles(username, full_name)
        `)
        .order('assigned_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role,
          assigned_by: user.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUserRoles'] });
      toast({
        title: 'Role assigned',
        description: 'User role has been updated successfully'
      });
      setSelectedUser('');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to assign role',
        variant: 'destructive'
      });
    }
  });

  const removeRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUserRoles'] });
      toast({
        title: 'Role removed',
        description: 'User role has been removed successfully'
      });
    }
  });

  const getRoleIcon = (role: AppRole) => {
    switch (role) {
      case 'admin': return <Shield className="h-4 w-4" />;
      case 'moderator': return <UserCog className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: AppRole) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'moderator': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Assign User Role</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select User</label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a user" />
              </SelectTrigger>
              <SelectContent>
                {profiles?.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.username} {profile.full_name && `(${profile.full_name})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Select Role</label>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => selectedUser && assignRoleMutation.mutate({ userId: selectedUser, role: selectedRole })}
            disabled={!selectedUser || assignRoleMutation.isPending}
            className="w-full"
          >
            {assignRoleMutation.isPending ? 'Assigning...' : 'Assign Role'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Role Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {userRoles?.map((userRole) => (
              <div key={userRole.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant={getRoleColor(userRole.role as AppRole)} className="gap-1">
                    {getRoleIcon(userRole.role as AppRole)}
                    {userRole.role}
                  </Badge>
                  <span className="font-medium">
                    {userRole.profiles?.username || 'Unknown User'}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRoleMutation.mutate(userRole.id)}
                  disabled={removeRoleMutation.isPending}
                >
                  Remove
                </Button>
              </div>
            ))}
            {(!userRoles || userRoles.length === 0) && (
              <p className="text-center text-muted-foreground py-8">No role assignments yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
