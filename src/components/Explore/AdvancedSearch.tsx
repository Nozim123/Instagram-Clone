import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Search, SlidersHorizontal } from "lucide-react";
import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface SearchFilters {
  query: string;
  mediaType: "all" | "image" | "video";
  dateFrom?: Date;
  dateTo?: Date;
  minLikes: number;
  sortBy: "recent" | "popular" | "engagement";
}

export const AdvancedSearch = () => {
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    mediaType: "all",
    minLikes: 0,
    sortBy: "recent",
  });

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["advanced-search", filters],
    queryFn: async () => {
      let query = supabase
        .from("posts")
        .select(`
          *,
          user:profiles(id, username, avatar_url)
        `);

      // Apply filters
      if (filters.query) {
        query = query.or(`caption.ilike.%${filters.query}%,location.ilike.%${filters.query}%`);
      }

      if (filters.mediaType !== "all") {
        query = query.eq("media_type", filters.mediaType);
      }

      if (filters.dateFrom) {
        query = query.gte("created_at", filters.dateFrom.toISOString());
      }

      if (filters.dateTo) {
        query = query.lte("created_at", filters.dateTo.toISOString());
      }

      if (filters.minLikes > 0) {
        query = query.gte("likes_count", filters.minLikes);
      }

      // Apply sorting
      if (filters.sortBy === "recent") {
        query = query.order("created_at", { ascending: false });
      } else if (filters.sortBy === "popular") {
        query = query.order("likes_count", { ascending: false });
      } else if (filters.sortBy === "engagement") {
        query = query.order("comments_count", { ascending: false });
      }

      query = query.limit(50);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: filters.query.length > 0,
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search posts, locations, captions..."
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            className="pl-10"
          />
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>

            <div className="space-y-6 mt-6">
              {/* Media Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Media Type</label>
                <Select
                  value={filters.mediaType}
                  onValueChange={(value: any) => setFilters({ ...filters, mediaType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="image">Images</SelectItem>
                    <SelectItem value="video">Videos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1 justify-start text-left">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateFrom ? format(filters.dateFrom, "PP") : "From"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.dateFrom}
                        onSelect={(date) => setFilters({ ...filters, dateFrom: date })}
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1 justify-start text-left">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateTo ? format(filters.dateTo, "PP") : "To"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.dateTo}
                        onSelect={(date) => setFilters({ ...filters, dateTo: date })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Minimum Likes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Minimum Likes</label>
                <Input
                  type="number"
                  min="0"
                  value={filters.minLikes}
                  onChange={(e) => setFilters({ ...filters, minLikes: parseInt(e.target.value) || 0 })}
                />
              </div>

              {/* Sort By */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Sort By</label>
                <Select
                  value={filters.sortBy}
                  onValueChange={(value: any) => setFilters({ ...filters, sortBy: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="engagement">Most Engaged</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full"
                onClick={() => setFilters({
                  query: filters.query,
                  mediaType: "all",
                  minLikes: 0,
                  sortBy: "recent",
                })}
              >
                Reset Filters
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Results */}
      <div className="grid grid-cols-3 gap-1">
        {results.map((post) => (
          <div key={post.id} className="aspect-square relative group">
            <img
              src={post.media_urls[0]}
              alt={post.caption || "Post"}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
              <div className="flex items-center gap-1">
                <Search className="h-5 w-5" />
                <span>{post.likes_count}</span>
              </div>
            </div>
          </div>
        ))}

        {filters.query && results.length === 0 && !isLoading && (
          <div className="col-span-3 text-center py-12 text-muted-foreground">
            No posts found matching your criteria
          </div>
        )}
      </div>
    </div>
  );
};
