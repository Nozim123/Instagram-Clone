import { Home, Search, Film, Bot, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";

export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border">
      <div className="flex items-center justify-around h-14 px-2">
        <NavLink to="/feed" className="flex flex-col items-center justify-center flex-1 h-full py-2" activeClassName="text-accent">
          <Home className="h-5 w-5" />
          <span className="text-[10px] mt-0.5">Home</span>
        </NavLink>
        <NavLink to="/explore" className="flex flex-col items-center justify-center flex-1 h-full py-2" activeClassName="text-accent">
          <Search className="h-5 w-5" />
          <span className="text-[10px] mt-0.5">Search</span>
        </NavLink>
        <NavLink to="/reels" className="flex flex-col items-center justify-center flex-1 h-full py-2" activeClassName="text-accent">
          <Film className="h-5 w-5" />
          <span className="text-[10px] mt-0.5">Reels</span>
        </NavLink>
        <NavLink to="/ai" className="flex flex-col items-center justify-center flex-1 h-full py-2" activeClassName="text-accent">
          <Bot className="h-5 w-5" />
          <span className="text-[10px] mt-0.5">AI</span>
        </NavLink>
        <NavLink to="/profile" className="flex flex-col items-center justify-center flex-1 h-full py-2" activeClassName="text-accent">
          <User className="h-5 w-5" />
          <span className="text-[10px] mt-0.5">Profile</span>
        </NavLink>
      </div>
    </nav>
  );
}
