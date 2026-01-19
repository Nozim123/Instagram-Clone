import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, FileText, MessageSquare, TrendingUp } from 'lucide-react';

export const AnalyticsDashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const [usersRes, postsRes, commentsRes, messagesRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('posts').select('id', { count: 'exact', head: true }),
        supabase.from('comments').select('id', { count: 'exact', head: true }),
        supabase.from('messages').select('id', { count: 'exact', head: true })
      ]);

      return {
        totalUsers: usersRes.count || 0,
        totalPosts: postsRes.count || 0,
        totalComments: commentsRes.count || 0,
        totalMessages: messagesRes.count || 0
      };
    }
  });

  const { data: userGrowth } = useQuery({
    queryKey: ['userGrowth'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('created_at')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by date
      const growthByDate: Record<string, number> = {};
      data?.forEach(user => {
        const date = new Date(user.created_at).toLocaleDateString();
        growthByDate[date] = (growthByDate[date] || 0) + 1;
      });

      return Object.entries(growthByDate).map(([date, count]) => ({
        date,
        users: count
      })).slice(-30); // Last 30 days
    }
  });

  const { data: postEngagement } = useQuery({
    queryKey: ['postEngagement'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('created_at, likes_count, comments_count')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return data?.map(post => ({
        date: new Date(post.created_at).toLocaleDateString(),
        likes: post.likes_count,
        comments: post.comments_count
      }));
    }
  });

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPosts || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Comments</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalComments || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalMessages || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Growth (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={userGrowth || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Post Engagement (Recent Posts)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={postEngagement || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="likes" fill="hsl(var(--accent))" />
                <Bar dataKey="comments" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
