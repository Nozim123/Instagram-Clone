import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import { AppLayout } from "@/components/Layout/AppLayout";
import Index from "./pages/Index";
import Feed from "./pages/Feed";
import Profile from "./pages/Profile";
import Messages from "./pages/Messages";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Reels from "./pages/Reels";
import Explore from "./pages/Explore";
import UserProfile from "./pages/UserProfile";
import Activity from "./pages/Activity";
import NotFound from "./pages/NotFound";
import AIAssistant from "./pages/AIAssistant";
import Drafts from "./pages/Drafts";
import Settings from "./pages/Settings";
import SavedCollections from "./pages/SavedCollections";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<Index />} />
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          
          {/* Protected routes with layout */}
          <Route path="/feed" element={<ProtectedRoute><AppLayout><Feed /></AppLayout></ProtectedRoute>} />
          <Route path="/reels" element={<ProtectedRoute><AppLayout><Reels /></AppLayout></ProtectedRoute>} />
          <Route path="/explore" element={<ProtectedRoute><AppLayout><Explore /></AppLayout></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>} />
          <Route path="/:username" element={<ProtectedRoute><AppLayout><UserProfile /></AppLayout></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><AppLayout><Messages /></AppLayout></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AppLayout><Admin /></AppLayout></ProtectedRoute>} />
          <Route path="/activity" element={<ProtectedRoute><AppLayout><Activity /></AppLayout></ProtectedRoute>} />
          <Route path="/ai" element={<ProtectedRoute><AppLayout><AIAssistant /></AppLayout></ProtectedRoute>} />
          <Route path="/drafts" element={<ProtectedRoute><AppLayout><Drafts /></AppLayout></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />
          <Route path="/saved" element={<ProtectedRoute><AppLayout><SavedCollections /></AppLayout></ProtectedRoute>} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
