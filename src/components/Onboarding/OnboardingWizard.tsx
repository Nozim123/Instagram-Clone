import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, Check } from "lucide-react";
import { z } from "zod";

const profileSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(30),
  full_name: z.string().max(100).optional(),
  bio: z.string().max(150).optional(),
  website: z.string().url().optional().or(z.literal("")),
});

export const OnboardingWizard = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({
    username: "",
    full_name: "",
    bio: "",
    website: "",
    avatar_url: "",
  });
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const { data: interests = [], isLoading: interestsLoading } = useQuery({
    queryKey: ["interests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("interests").select("*").order("category", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: suggestedUsers = [] } = useQuery({
    queryKey: ["suggested-users", selectedInterests],
    queryFn: async () => {
      if (selectedInterests.length === 0) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("is_private", false)
          .limit(10);
        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from("user_interests")
        .select("user_id, profiles(*)")
        .in("interest_id", selectedInterests);
      
      if (error) throw error;
      
      const uniqueUsers = Array.from(
        new Map(data.map((item: any) => [item.profiles.id, item.profiles])).values()
      );
      return uniqueUsers.slice(0, 10);
    },
    enabled: step === 3,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let avatarUrl = profile.avatar_url;

      if (avatarFile) {
        const fileExt = avatarFile.name.split(".").pop();
        const fileName = `${user.id}/avatar.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("post-media")
          .upload(fileName, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("post-media")
          .getPublicUrl(fileName);
        
        avatarUrl = publicUrl;
      }

      const validation = profileSchema.safeParse(profile);
      if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          username: profile.username,
          full_name: profile.full_name || null,
          bio: profile.bio || null,
          website: profile.website || null,
          avatar_url: avatarUrl,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      if (selectedInterests.length > 0) {
        const interestsData = selectedInterests.map(id => ({
          user_id: user.id,
          interest_id: id,
        }));

        const { error: interestsError } = await supabase
          .from("user_interests")
          .insert(interestsData);

        if (interestsError) throw interestsError;
      }

      const { error: onboardingError } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", user.id);

      if (onboardingError) throw onboardingError;
    },
    onSuccess: () => {
      toast({ title: "Profile setup complete!", description: "Welcome to the community" });
      navigate("/feed");
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const followUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("follows").insert({
        follower_id: user.id,
        following_id: userId,
        status: "accepted",
      });

      if (error) throw error;
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, avatar_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev =>
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const handleNext = () => {
    if (step === 1 && !profile.username) {
      toast({ title: "Username required", variant: "destructive" });
      return;
    }
    if (step < 3) setStep(step + 1);
  };

  const handleComplete = () => {
    updateProfileMutation.mutate();
  };

  if (interestsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Welcome! Let's set up your profile</h1>
          <div className="flex gap-2">
            {[1, 2, 3].map(num => (
              <div
                key={num}
                className={`h-2 flex-1 rounded-full ${
                  num <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback>
                  <Upload className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <Button variant="outline" type="button">Upload Photo</Button>
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Username*</label>
                <Input
                  value={profile.username}
                  onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="your_username"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Full Name</label>
                <Input
                  value={profile.full_name}
                  onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Bio</label>
                <Textarea
                  value={profile.bio}
                  onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell us about yourself..."
                  maxLength={150}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Website</label>
                <Input
                  value={profile.website}
                  onChange={(e) => setProfile(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Choose your interests</h2>
            <p className="text-muted-foreground">Select at least 3 to personalize your feed</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {interests.map(interest => (
                <Card
                  key={interest.id}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedInterests.includes(interest.id)
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  }`}
                  onClick={() => toggleInterest(interest.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{interest.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium">{interest.name}</div>
                      <div className="text-xs opacity-70">{interest.category}</div>
                    </div>
                    {selectedInterests.includes(interest.id) && (
                      <Check className="h-5 w-5" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Follow accounts you like</h2>
            <p className="text-muted-foreground">Start building your feed</p>
            <div className="space-y-3">
              {suggestedUsers.map((user: any) => (
                <Card key={user.id} className="p-4 flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>{user.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium">@{user.username}</div>
                    {user.bio && <div className="text-sm text-muted-foreground line-clamp-1">{user.bio}</div>}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => followUserMutation.mutate(user.id)}
                    disabled={followUserMutation.isPending}
                  >
                    Follow
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button onClick={handleNext} className="flex-1">
              Next
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={updateProfileMutation.isPending}
              className="flex-1"
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Complete"
              )}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};
