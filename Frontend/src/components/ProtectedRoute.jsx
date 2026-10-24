import React from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

/**
 * ProtectedRoute Component
 *
 * Restricts access to authenticated users only.
 * Redirects unauthenticated users to /login with previous location preserved.
 */
export const ProtectedRoute = ({ children, element }) => {
  const { isLoggedIn, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (element) {
    return element;
  }

  return children ? children : <Outlet />;
};

/**
 * PublicOnlyRoute Component
 *
 * Redirects authenticated users away from auth pages (login/register) to homepage.
 */
export const PublicOnlyRoute = ({ children, element, redirectTo = "/" }) => {
  const { isLoggedIn, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isLoggedIn) {
    return <Navigate to={redirectTo} replace />;
  }

  if (element) {
    return element;
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
