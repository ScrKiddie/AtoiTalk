import { useGoogleLogin } from "@/hooks/queries";
import { toast } from "@/lib/toast";
import { useUIStore } from "@/store";
import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { mutate: login } = useGoogleLogin();
  const hasProcessed = useRef(false);

  useEffect(() => {
    useUIStore.getState().setGlobalLoading(true, "Logging In");

    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      useUIStore.getState().setGlobalLoading(false);
      toast.error("Google authentication failed or was cancelled");
      navigate("/login", { replace: true });
      return;
    }

    if (!code || !state) {
      useUIStore.getState().setGlobalLoading(false);
      toast.error("Invalid Google authentication parameters");
      navigate("/login", { replace: true });
      return;
    }

    login(
      { code, state },
      {
        onSuccess: () => {
          navigate("/", { replace: true });
        },
        onError: (err) => {
          useUIStore.getState().setGlobalLoading(false);
          const msg = err.response?.data?.error || "Google login failed";
          toast.error(msg);
          navigate("/login", { replace: true });
        },
      }
    );
  }, [searchParams, navigate, login]);

  return null;
}
