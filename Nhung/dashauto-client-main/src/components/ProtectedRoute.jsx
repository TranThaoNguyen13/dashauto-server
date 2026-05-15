import { Navigate } from "react-router-dom";
import { getToken } from "../services/auth.service";

function ProtectedRoute({ children }) {
  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default ProtectedRoute;
