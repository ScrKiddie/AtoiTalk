import { AppSidebar } from "@/components/app-sidebar.tsx";
import { ModeToggle } from "@/components/mode-toggle.tsx";
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
import { Suspense, lazy, useEffect, useRef } from "react";
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

const AdminLayout = lazy(() => import("@/layouts/admin-layout"));
const AdminDashboard = lazy(() => import("@/pages/admin/dashboard"));
const AdminUsers = lazy(() => import("@/pages/admin/users"));
const AdminGroups = lazy(() => import("@/pages/admin/groups"));
const AdminReports = lazy(() => import("@/pages/admin/reports"));
const ProtectedAdminRoute = lazy(() => import("@/components/protected-admin-route"));

const EmptyChatState = () => {
  return (
    <SidebarInset className="h-screen overflow-hidden flex flex-col relative bg-sidebar">
      <header className="absolute top-0 left-0 w-full outline-1 dark:outline-[#212224] outline-[#e4e4e7] z-50 bg-background flex h-[63px] shrink-0 items-center gap-2">
        <div className="flex gap-2 px-4 w-full justify-between items-center">
          <div className="flex items-center justify-center gap-2">
            <SidebarTrigger className={`mr-1`} />
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
          </div>
        </div>
      </header>
      <div className="flex flex-col items-center justify-center flex-1 w-full p-4">
        <div className="flex justify-center w-full">
          <div className="inline-flex items-center justify-center bg-background border text-foreground rounded-full px-3 py-1 text-xs font-normal">
            Select a chat and start messaging
          </div>
        </div>
      </div>
      <footer className="w-full flex flex-col items-center md:items-end justify-center py-4 px-6 bg-background border-t mt-auto text-center md:text-right">
        <p className="text-sm text-muted-foreground">
          AtoiTalk © {new Date().getFullYear()} All Rights Reserved
        </p>
      </footer>
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
    if (pathname.startsWith("/admin")) {
      return "admin-layout";
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
    <WebSocketProvider>
      <AnimatePresence mode="wait" initial={true}>
        <Routes location={location} key={getPageKey(location.pathname)}>
          <Route path="/invite/:code" element={<InvitePage />} />

          <Route
            path="/admin/*"
            element={
              <Suspense
                fallback={<LoadingScreen isLoading={true} message="Initializing AtoiTalk" />}
              >
                <ProtectedAdminRoute />
              </Suspense>
            }
          >
            <Route element={<AdminLayout />}>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="groups" element={<AdminGroups />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Route>
          </Route>

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
                <SidebarProvider>
                  <AppSidebar />
                  <Routes>
                    <Route path="/" element={<EmptyChatState />} />
                    <Route path="/chat/:chatId" element={<ChatRoom />} />
                    <Route path="/chat/u/:userId" element={<ChatRoom />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </SidebarProvider>
              }
            />
          </Route>
        </Routes>
      </AnimatePresence>
    </WebSocketProvider>
  );
};

import { LoadingScreen } from "@/components/ui/loading-screen";
import { useAuthStore, useUIStore } from "@/store";
import { useState } from "react";

import { GoogleOAuthProvider } from "@react-oauth/google";

import { BannedUserDialog } from "@/components/modals/banned-user-dialog";
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
          message={globalLoading ? loadingMessage || "Loading" : "Initializing AtoiTalk"}
        />
        <Router>
          <UserProfileDialog />
          <BannedUserDialog />
          <AnimatedRoutes />
          <Toaster position="top-center" />
        </Router>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
