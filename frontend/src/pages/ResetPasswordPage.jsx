import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function ResetPasswordPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/forgot-password", { replace: true });
  }, [navigate]);

  return <LoadingScreen message="Redirecting..." />;
}
