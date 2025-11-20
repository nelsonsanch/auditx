import { useEffect, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ResetPassword from "@/pages/ResetPassword";
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";
import ClientDashboard from "@/pages/ClientDashboard";
import CreateInspection from "@/pages/CreateInspection";
import ViewInspection from "@/pages/ViewInspection";
import { Toaster } from "@/components/ui/sonner";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("userRole");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={["superadmin"]}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/client/dashboard"
            element={
              <ProtectedRoute allowedRoles={["client"]}>
                <ClientDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/client/inspection/create"
            element={
              <ProtectedRoute allowedRoles={["client"]}>
                <CreateInspection />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/client/inspection/:id"
            element={
              <ProtectedRoute allowedRoles={["client"]}>
                <ViewInspection />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;