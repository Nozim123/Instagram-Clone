import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, Grid, Bookmark, Users } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProfileHeaderProps {
  username: string;
  avatar?: string;
  posts: number;
  followers: number;
  following: number;
  bio?: string;
  website?: string;
}

export const ProfileHeader = ({
  username,
  avatar,
  posts,
  followers,
  following,
  bio,
  website,
}: ProfileHeaderProps) => {
  return (
    <div className="w-full">
      {/* Profile Info */}
      <div className="flex flex-col md:flex-row gap-8 p-4 md:p-8 border-b border-border">
        {/* Avatar */}
        <div className="flex justify-center md:justify-start">
          <Avatar className="h-32 w-32 md:h-40 md:w-40">
            <AvatarImage src={avatar} alt={username} />
            <AvatarFallback className="text-4xl">{username[0].toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>

        {/* Profile Details */}
        <div className="flex-1 space-y-4">
          {/* Username & Actions */}
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-light">{username}</h2>
            <Button variant="secondary" size="sm">
              Edit Profile
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </div>

          {/* Stats */}
          <div className="flex gap-8">
            <div className="text-center md:text-left">
              <span className="font-semibold">{posts}</span>
              <span className="text-muted-foreground ml-1">posts</span>
            </div>
            <button className="text-center md:text-left hover:opacity-70">
              <span className="font-semibold">{followers}</span>
              <span className="text-muted-foreground ml-1">followers</span>
            </button>
            <button className="text-center md:text-left hover:opacity-70">
              <span className="font-semibold">{following}</span>
              <span className="text-muted-foreground ml-1">following</span>
            </button>
          </div>

          {/* Bio */}
          <div className="space-y-1">
            {bio && <p className="text-sm">{bio}</p>}
            {website && (
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent hover:underline"
              >
                {website}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="w-full justify-center border-t-0 bg-transparent h-auto p-0">
          <TabsTrigger
            value="posts"
            className="flex-1 gap-2 data-[state=active]:border-t-2 data-[state=active]:border-foreground rounded-none"
          >
            <Grid className="h-4 w-4" />
            <span className="hidden sm:inline">POSTS</span>
          </TabsTrigger>
          <TabsTrigger
            value="saved"
            className="flex-1 gap-2 data-[state=active]:border-t-2 data-[state=active]:border-foreground rounded-none"
          >
            <Bookmark className="h-4 w-4" />
            <span className="hidden sm:inline">SAVED</span>
          </TabsTrigger>
          <TabsTrigger
            value="tagged"
            className="flex-1 gap-2 data-[state=active]:border-t-2 data-[state=active]:border-foreground rounded-none"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">TAGGED</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};
