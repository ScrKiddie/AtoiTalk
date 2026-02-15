import { useAuthStore } from "@/store";
import { Navigate, Outlet } from "react-router-dom";

const ProtectedAdminRoute = () => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedAdminRoute;
