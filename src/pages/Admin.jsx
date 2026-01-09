import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar que el usuario sea superadmin
    if (user?.role !== "superadmin") {
      navigate("/dashboard");
    } else {
      // Redirigir a usuarios por defecto
      navigate("/admin/users");
    }
  }, [user, navigate]);

  return null; // Esta página solo redirige
};

export default Admin;
