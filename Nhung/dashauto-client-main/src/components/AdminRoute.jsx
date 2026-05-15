import { Navigate } from "react-router-dom";
import { getToken, getUser } from "../services/auth.service";

function AdminRoute({ children }) {
  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }

  const user = getUser();
  if (user?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default AdminRoute;
