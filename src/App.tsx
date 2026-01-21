import { AppSidebar } from "@/components/app-sidebar.tsx";
import Logo from "@/components/logo.tsx";
import ProtectedRoute from "@/components/protected-route";
import PublicRoute from "@/components/public-route";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar.tsx";
import { WebSocketProvider } from "@/context/websocket-context";
import ChatRoom from "@/pages/chat-room.tsx";
import InvitePage from "@/pages/invite";
import Login from "@/pages/login";
import Verify from "@/pages/verify";
import { AnimatePresence } from "framer-motion";
import { useEffect, useRef } from "react";
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

const EmptyChatState = () => {
  return (
    <SidebarInset className="h-screen overflow-hidden flex flex-col relative">
      <header className="absolute top-0 left-0 w-full outline-1 dark:outline-[#212224] outline-[#e4e4e7] z-50 bg-background flex h-[63px] shrink-0 items-center gap-2">
        <div className="flex gap-2 px-4 w-full justify-between items-center">
          <div className="flex items-center justify-center gap-2">
            <SidebarTrigger className={`mr-1`} />
          </div>
        </div>
      </header>
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <div className="flex items-center justify-center mb-1 text-primary">
          <Logo width={80} height={80} />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Welcome to AtoiTalk</h2>
        <p className="text-muted-foreground">Select a chat and start messaging</p>
      </div>
    </SidebarInset>
  );
};

const AnimatedRoutes = () => {
  const location = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    isFirstRender.current = false;
  }, []);

  const getPageKey = (pathname: string) => {
    if (pathname === "/" || pathname.startsWith("/chat")) {
      return "app-layout";
    }
    return pathname;
  };

  const navigate = useNavigate();

  useEffect(() => {
    const handleUnauthorized = () => {
      if (!location.pathname.startsWith("/login")) {
        navigate("/login");
      }
    };

    window.addEventListener("unauthorized", handleUnauthorized);
    return () => window.removeEventListener("unauthorized", handleUnauthorized);
  }, [navigate, location.pathname]);

  return (
    <AnimatePresence mode="wait" initial={true}>
      <Routes location={location} key={getPageKey(location.pathname)}>
        <Route path="/invite/:code" element={<InvitePage />} />

        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Verify />} />
          <Route path="/forgot" element={<Verify />} />
          <Route path="/verify" element={<Verify />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route
            path="/*"
            element={
              <WebSocketProvider>
                <SidebarProvider>
                  <AppSidebar />
                  <Routes>
                    <Route path="/" element={<EmptyChatState />} />
                    <Route path="/chat/:chatId" element={<ChatRoom />} />
                    <Route path="/chat/u/:userId" element={<ChatRoom />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </SidebarProvider>
              </WebSocketProvider>
            }
          />
        </Route>
      </Routes>
    </AnimatePresence>
  );
};

import { LoadingScreen } from "@/components/ui/loading-screen";
import { useAuthStore, useUIStore } from "@/store";
import { useState } from "react";

import { GoogleOAuthProvider } from "@react-oauth/google";

import { UserProfileDialog } from "@/components/modals/user-profile-dialog";
import { Toaster } from "@/components/ui/sonner";

function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID_HERE";

  const [showSplash, setShowSplash] = useState(() => {
    const path = window.location.pathname;
    const isAuthPage =
      path === "/login" || path === "/register" || path === "/verify" || path === "/forgot";

    if (isAuthPage && useAuthStore.getState().isAuthenticated) {
      return true;
    }

    return !isAuthPage;
  });

  useEffect(() => {
    if (showSplash) {
      const timer = setTimeout(() => setShowSplash(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  const globalLoading = useUIStore((state) => state.globalLoading);
  const loadingMessage = useUIStore((state) => state.loadingMessage);

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <ThemeProvider>
        <LoadingScreen
          isLoading={showSplash || globalLoading}
          message={globalLoading ? loadingMessage || "Loading..." : "Initializing AtoiTalk"}
        />
        <Router>
          <UserProfileDialog />
          <AnimatedRoutes />
          <Toaster position="top-center" />
        </Router>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
