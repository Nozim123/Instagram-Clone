import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { BottomNav } from "./BottomNav";
import { RightSidebar } from "./RightSidebar";
import { NotificationCenter } from "@/components/Notifications/NotificationCenter";
import { useLocation } from "react-router-dom";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const showRightSidebar = ["/feed", "/explore"].includes(location.pathname);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="hidden md:flex h-14 items-center justify-between px-4 border-b border-border bg-background/95 backdrop-blur sticky top-0 z-40">
            <SidebarTrigger />
            <div className="flex items-center gap-4">
              <NotificationCenter />
            </div>
          </header>

          <div className="flex-1 flex">
            <main className="flex-1 pb-20 md:pb-0 overflow-auto">
              {children}
            </main>
            {showRightSidebar && <RightSidebar />}
          </div>
        </div>

        <BottomNav />
      </div>
    </SidebarProvider>
  );
}
