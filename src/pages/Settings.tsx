import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Bell, Moon, Sun, Globe, Shield, Trash2 } from "lucide-react";

const Settings = () => {
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (localStorage.getItem("theme") as "light" | "dark") || "light"
  );
  const queryClient = useQueryClient();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const { data: notificationSettings, isLoading } = useQuery({
    queryKey: ["notification-settings"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await (supabase as any)
        .from("notification_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as Record<string, boolean> | null;
    },
  });

  const updateNotificationsMutation = useMutation({
    mutationFn: async (settings: Record<string, boolean>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await (supabase as any)
        .from("notification_settings")
        .upsert({ user_id: user.id, ...settings }, { onConflict: "user_id" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
      toast({ title: "Settings saved" });
    },
  });

  const { data: blockedUsers } = useQuery({
    queryKey: ["blocked-users"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await (supabase as any)
        .from("user_blocks")
        .select(`
          id,
          blocked_id,
          profiles:blocked_id(username, avatar_url)
        `)
        .eq("blocker_id", user.id);

      if (error) throw error;
      return data as any[];
    },
  });

  const unblockMutation = useMutation({
    mutationFn: async (blockId: string) => {
      const { error } = await (supabase as any).from("user_blocks").delete().eq("id", blockId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
      toast({ title: "User unblocked" });
    },
  });

  const toggleSetting = (key: string, value: boolean) => {
    updateNotificationsMutation.mutate({ [key]: value });
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            Appearance
          </CardTitle>
          <CardDescription>Customize how DonoNet looks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label>Dark Mode</Label>
              <p className="text-sm text-muted-foreground">Toggle dark theme</p>
            </div>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>Control what notifications you receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "likes_enabled", label: "Likes", desc: "When someone likes your post" },
            { key: "comments_enabled", label: "Comments", desc: "When someone comments on your post" },
            { key: "follows_enabled", label: "New Followers", desc: "When someone follows you" },
            { key: "mentions_enabled", label: "Mentions", desc: "When someone mentions you" },
            { key: "messages_enabled", label: "Messages", desc: "When you receive a message" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <Label>{item.label}</Label>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            <Switch
              checked={notificationSettings?.[item.key] ?? true}
              onCheckedChange={(checked) => toggleSetting(item.key, checked)}
              disabled={isLoading}
            />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy & Blocked Users
          </CardTitle>
          <CardDescription>Manage blocked accounts</CardDescription>
        </CardHeader>
        <CardContent>
          {blockedUsers?.length === 0 ? (
            <p className="text-sm text-muted-foreground">No blocked users</p>
          ) : (
            <div className="space-y-3">
              {blockedUsers?.map((block: any) => (
                <div key={block.id} className="flex items-center justify-between">
                  <span className="text-sm">@{block.profiles?.username || "Unknown"}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => unblockMutation.mutate(block.id)}
                  >
                    Unblock
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Language
          </CardTitle>
          <CardDescription>Select your preferred language</CardDescription>
        </CardHeader>
        <CardContent>
          <select className="w-full p-2 rounded-md border border-input bg-background">
            <option value="en">English</option>
            <option value="uz">O'zbek</option>
            <option value="ru">Русский</option>
          </select>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive">Delete Account</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;