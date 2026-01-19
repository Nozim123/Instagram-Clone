import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface Story {
  id: string;
  username: string;
  avatar?: string;
  hasStory: boolean;
}

const MOCK_STORIES: Story[] = [
  { id: "1", username: "your_story", hasStory: false },
  { id: "2", username: "alex_photos", avatar: "/placeholder.svg", hasStory: true },
  { id: "3", username: "sarah_travels", avatar: "/placeholder.svg", hasStory: true },
  { id: "4", username: "mike_food", avatar: "/placeholder.svg", hasStory: true },
  { id: "5", username: "emma_art", avatar: "/placeholder.svg", hasStory: true },
  { id: "6", username: "john_fitness", avatar: "/placeholder.svg", hasStory: true },
  { id: "7", username: "lisa_fashion", avatar: "/placeholder.svg", hasStory: true },
];

export const StoryCarousel = () => {
  return (
    <div className="w-full border-b border-border bg-background">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4 p-4">
          {MOCK_STORIES.map((story) => (
            <button
              key={story.id}
              className="flex flex-col items-center gap-1 min-w-fit"
            >
              <div
                className={`rounded-full p-0.5 ${
                  story.hasStory
                    ? "bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]"
                    : "bg-muted"
                }`}
              >
                <div className="rounded-full p-0.5 bg-background">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={story.avatar} alt={story.username} />
                    <AvatarFallback>{story.username[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <span className="text-xs max-w-[64px] truncate">
                {story.username}
              </span>
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
