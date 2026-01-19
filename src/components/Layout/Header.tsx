import { useState } from "react";
import { Home, Search, User, MessageCircle, Film, Compass } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreatePost } from "@/components/Posts/CreatePost";
import { CreateReel } from "@/components/Reels/CreateReel";
import { CreateStory } from "@/components/Stories/CreateStory";
import { NotificationCenter } from "@/components/Notifications/NotificationCenter";

export const Header = () => {
  const [reelOpen, setReelOpen] = useState(false);
  
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link to="/" className="text-2xl font-semibold tracking-tight">
          Instaclone
        </Link>

        {/* Search - Desktop */}
        <div className="hidden md:flex flex-1 max-w-xs mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search"
              className="pl-10 bg-secondary border-0"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/feed">
              <Home className="h-6 w-6" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link to="/explore">
              <Compass className="h-6 w-6" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link to="/reels">
              <Film className="h-6 w-6" />
            </Link>
          </Button>
          <CreatePost />
          <Button variant="ghost" size="icon" onClick={() => setReelOpen(true)}>
            <Film className="h-6 w-6" />
          </Button>
          <CreateReel open={reelOpen} onOpenChange={setReelOpen} />
          <CreateStory />
          <Button variant="ghost" size="icon" asChild>
            <Link to="/messages">
              <MessageCircle className="h-6 w-6" />
            </Link>
          </Button>
          <NotificationCenter />
          <Button variant="ghost" size="icon" asChild>
            <Link to="/profile">
              <User className="h-6 w-6" />
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
};
