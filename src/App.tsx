import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate, HashRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import PastAssessmentsPage from "./pages/PastAssessmentsPage";
import MainLayout from "./components/Layout/MainLayout";
import { useEffect, useState } from "react";


const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

if (!user) {
  return <>{children}</>; 
}

  return <>{children}</>;
};

const App = () => {
  const [userDetails, setUserDetails] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(null);
  useEffect(() => {
    fetchUserDetails();
  }, []);
  const fetchUserDetails = async () => {
    try {
      const response = await fetch(
        "/apis/proxies/v8/api/user/v2/read",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch user details");
      }

      const data = await response.json();
      const responseUserDetails = data?.result?.response;

      // Check authorization
      const hasAccess = responseUserDetails?.roles?.includes(
        "AI_ASSESSMENT_CREATOR"
      );
      if (!hasAccess) {
        setIsAuthorized(false);
        return null;
      }

      setIsAuthorized(true);
      setUserDetails(responseUserDetails);

      return data?.result || null;
    } catch (error) {
      console.error("User details fetch error:", error);
      setIsAuthorized(false);
      return null;
    }
  };
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <HashRouter>
            <Routes>
              <Route path="/login" element={<Login />} />

              {/* Layout with Header */}
              <Route element={<MainLayout userDetails={userDetails} isAuthorized={isAuthorized} />}>
                <Route path="/" element={<Index userDetails={userDetails}/>} />

                <Route
                  path="/past-assessments"
                  element={
                    <ProtectedRoute>
                      <PastAssessmentsPage />
                    </ProtectedRoute>
                  }
                />

              </Route>

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </HashRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
export default App;
