import { Routes, Route } from "react-router-dom";
import MainLayout from "./components/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import DashboardDetail from "./pages/DashboardDetail";
import Builder from "./pages/Builder";
import Admin from "./pages/Admin";
import AdminSkins from "./pages/AdminSkins";
import Invitation from "./pages/Invitation";
import NaverCallback from "./pages/NaverCallback";
import KakaoCallback from "./pages/KakaoCallback";

export default function App() {
  return (
    <Routes>
      <Route path="/invitation/:slug" element={<Invitation />} />
      <Route path="/auth/naver/callback" element={<NaverCallback />} />
      <Route path="/auth/kakao/callback" element={<KakaoCallback />} />
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/dashboard/:id" element={<ProtectedRoute><DashboardDetail /></ProtectedRoute>} />
        <Route path="/builder" element={<ProtectedRoute><Builder /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
        <Route path="/admin/skins" element={<ProtectedRoute requireAdmin><AdminSkins /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}
