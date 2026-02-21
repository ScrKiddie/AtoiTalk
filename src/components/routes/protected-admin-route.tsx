import { useCurrentUser } from "@/hooks/queries";
import { useAuthStore } from "@/store";
import { Navigate, Outlet } from "react-router-dom";

const ProtectedAdminRoute = () => {
  const { user: authUser, isAuthenticated } = useAuthStore();
  const { data: currentUser, isLoading } = useCurrentUser();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return null;
  }

  const role = currentUser?.role || authUser?.role;

  if (role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedAdminRoute;
