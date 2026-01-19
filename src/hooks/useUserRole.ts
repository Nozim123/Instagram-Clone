import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'user' | 'moderator' | 'admin';

export const useUserRole = (userId?: string) => {
  return useQuery({
    queryKey: ['userRole', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) throw error;
      
      // Return the highest role (admin > moderator > user)
      const roles = data?.map(r => r.role) || [];
      if (roles.includes('admin')) return 'admin';
      if (roles.includes('moderator')) return 'moderator';
      return 'user';
    },
    enabled: !!userId
  });
};

export const useHasRole = (userId?: string, requiredRole?: AppRole) => {
  const { data: userRole } = useUserRole(userId);
  
  if (!requiredRole || !userRole) return false;
  
  const roleHierarchy: Record<AppRole, number> = {
    user: 1,
    moderator: 2,
    admin: 3
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};
