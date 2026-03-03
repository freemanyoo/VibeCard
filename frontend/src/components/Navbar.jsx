import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Heart, LayoutDashboard, PlusCircle, LogOut, LogIn, UserPlus, ShieldCheck } from "lucide-react";

export default function Navbar() {
  const { user, logout, loading } = useAuth();

  return (
    <nav className="sticky top-0 z-[100] w-full bg-white/80 backdrop-blur-md border-b border-zinc-100 px-6 py-3">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <Heart size={16} className="text-white fill-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight">VibeCard</span>
            <span className="flex items-end gap-0.5 h-4" aria-hidden="true">
              <span
                className="w-0.5 rounded-full bg-zinc-900/80 animate-pulse"
                style={{ height: "45%", animationDelay: "0ms" }}
              />
              <span
                className="w-0.5 rounded-full bg-zinc-900/80 animate-pulse"
                style={{ height: "85%", animationDelay: "180ms" }}
              />
              <span
                className="w-0.5 rounded-full bg-zinc-900/80 animate-pulse"
                style={{ height: "60%", animationDelay: "360ms" }}
              />
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-4 md:gap-8">
          {user ? (
            <>
              <Link to="/dashboard" className="flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-black transition-colors">
                <LayoutDashboard size={18} />
                <span className="hidden sm:inline">대시보드</span>
              </Link>
              {!loading && user.role === "ADMIN" && (
                <Link to="/admin" className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                  <ShieldCheck size={18} />
                  <span className="hidden sm:inline">사이트 관리</span>
                </Link>
              )}
              <Link to="/builder" className="flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-black transition-colors">
                <PlusCircle size={18} />
                <span className="hidden sm:inline">청첩장 만들기</span>
              </Link>
              <button onClick={logout} className="flex items-center gap-1.5 text-sm font-medium text-zinc-400 hover:text-red-500 transition-colors">
                <LogOut size={18} />
                <span className="hidden sm:inline">로그아웃</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-black transition-colors">
                <LogIn size={18} />
                <span>로그인</span>
              </Link>
              <Link to="/signup" className="flex items-center gap-1.5 px-4 py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-zinc-800 transition-all shadow-lg shadow-black/10">
                <UserPlus size={18} className="sm:hidden" />
                <span className="hidden sm:inline">무료로 시작하기</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
