import { Home, Compass, Film, MessageCircle, Bell, User, Bot, FileText, Settings, Bookmark } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { CreatePost } from "@/components/Posts/CreatePost";
import { CreateStory } from "@/components/Stories/CreateStory";
import { useState } from "react";
import { CreateReel } from "@/components/Reels/CreateReel";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Home", url: "/feed", icon: Home },
  { title: "Explore", url: "/explore", icon: Compass },
  { title: "Reels", url: "/reels", icon: Film },
  { title: "Messages", url: "/messages", icon: MessageCircle },
  { title: "Notifications", url: "/activity", icon: Bell },
  { title: "AI Assistant", url: "/ai", icon: Bot },
  { title: "Drafts", url: "/drafts", icon: FileText },
  { title: "Saved", url: "/saved", icon: Bookmark },
  { title: "Profile", url: "/profile", icon: User },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const [reelOpen, setReelOpen] = useState(false);
  const collapsed = state === "collapsed";

  return (
    <Sidebar className={collapsed ? "w-20" : "w-64"}>
      <SidebarContent className="pt-6 flex flex-col h-full">
        {/* Logo */}
        <div className="px-4 mb-6">
          <NavLink to="/feed" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-accent-foreground font-bold">
              D
            </div>
            {!collapsed && <span className="text-xl font-bold">DonoNet</span>}
          </NavLink>
        </div>

        <SidebarGroup className="flex-1">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-secondary transition-colors"
                      activeClassName="bg-secondary font-semibold"
                    >
                      <item.icon className="h-5 w-5" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Create Post Button */}
        <div className="px-4 pb-6 space-y-2">
          <CreatePost />
          {!collapsed && (
            <>
              <div className="flex gap-2">
                <CreateStory />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReelOpen(true)}
                  className="flex-1"
                >
                  <Film className="h-4 w-4 mr-1" />
                  Reel
                </Button>
              </div>
            </>
          )}
        </div>

        <CreateReel open={reelOpen} onOpenChange={setReelOpen} />
      </SidebarContent>
    </Sidebar>
  );
}