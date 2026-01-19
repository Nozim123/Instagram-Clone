import { ProfileHeader } from "@/components/Profile/ProfileHeader";
import { NavLink } from "@/components/NavLink";
import { Bookmark, Grid3X3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MOCK_PROFILE = {
  username: "your_username",
  avatar: "/placeholder.svg",
  posts: 42,
  followers: 1234,
  following: 567,
  bio: "Photography enthusiast 📸 | Travel lover ✈️ | Coffee addict ☕",
  website: "https://yourwebsite.com",
};

const MOCK_PROFILE_POSTS = Array.from({ length: 12 }, (_, i) => ({
  id: `post-${i}`,
  image: `https://images.unsplash.com/photo-${1500000000000 + i * 100000000}?w=400`,
}));

const Profile = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <ProfileHeader {...MOCK_PROFILE} />
      
      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="w-full justify-center border-t border-border rounded-none bg-transparent h-12">
          <TabsTrigger value="posts" className="flex items-center gap-2 data-[state=active]:border-t-2 data-[state=active]:border-foreground rounded-none">
            <Grid3X3 className="h-4 w-4" />
            <span className="hidden sm:inline">Posts</span>
          </TabsTrigger>
          <TabsTrigger value="saved" asChild>
            <NavLink to="/saved" className="flex items-center gap-2 px-4 py-2 hover:bg-muted/50 transition-colors">
              <Bookmark className="h-4 w-4" />
              <span className="hidden sm:inline">Saved</span>
            </NavLink>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="posts" className="mt-0">
          {/* Posts Grid */}
          <div className="grid grid-cols-3 gap-1 md:gap-4 p-1 md:p-4">
            {MOCK_PROFILE_POSTS.map((post) => (
              <button
                key={post.id}
                className="aspect-square overflow-hidden bg-muted hover:opacity-80 transition-opacity"
              >
                <img
                  src={post.image}
                  alt="Post"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;
