import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Users, FileText, MessageSquare, ExternalLink, ShieldCheck, ArrowRight, UserCircle, Palette, LogOut } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../lib/auth";

export default function Admin() {
  const { logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(null);

  useEffect(() => {
    api.get("/admin/stats")
      .then((res) => { setData(res.data); setErrorStatus(null); })
      .catch((err) => { setErrorStatus(err.response?.status ?? 0); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-zinc-400 text-sm">로딩 중...</div></div>;
  if (errorStatus === 403)
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl border border-zinc-100 shadow-xl p-10 text-center space-y-6">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 mx-auto"><ShieldCheck size={32} /></div>
          <h1 className="text-xl font-bold text-zinc-900">관리자 권한이 필요합니다</h1>
          <p className="text-zinc-500 text-sm leading-relaxed">
            이 페이지는 관리자만 접근할 수 있습니다. 관리자 권한이 막 부여된 경우 <strong>로그아웃 후 다시 로그인</strong>하면 새 권한이 적용됩니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button type="button" onClick={() => { logout(); window.location.href = "/login"; }} className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-black">
              <LogOut size={16} /> 로그아웃 후 재로그인
            </button>
            <Link to="/dashboard" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-zinc-100 text-zinc-700 rounded-xl text-sm font-bold hover:bg-zinc-200">대시보드로 이동</Link>
          </div>
        </div>
      </div>
    );
  if (!data) return <div className="p-10 text-red-500"><h1 className="text-xl font-bold">에러가 발생했습니다.</h1><p className="text-sm mt-2">잠시 후 다시 시도해 주세요.</p></div>;

  const { stats, recentInvitations, users } = data;

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex justify-between items-center bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm">
          <div className="flex items-center gap-6"><div className="w-16 h-16 bg-zinc-900 rounded-3xl flex items-center justify-center text-white"><ShieldCheck size={32} /></div><div><h1 className="text-3xl font-black text-zinc-900 tracking-tight">서비스 관리자 페이지</h1><p className="text-zinc-500 font-medium">서비스 전체 현황 및 데이터를 관리합니다.</p></div></div>
          <div className="flex gap-4"><Link to="/admin/skins" className="px-6 py-3 bg-zinc-900 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-black flex items-center gap-2"><Palette size={16} /> 스킨 디자인 관리</Link><Link to="/dashboard" className="px-6 py-3 bg-zinc-50 rounded-2xl text-xs font-bold uppercase tracking-widest text-zinc-500 hover:bg-zinc-100">내 대시보드로 돌아가기</Link></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[{label:"전체 가입자",value:stats.totalUsers,unit:"명",icon:UserCircle,color:"bg-blue-50 text-blue-500"},{label:"전체 청첩장",value:stats.totalInvitations,icon:FileText,color:"bg-purple-50 text-purple-500"},{label:"전체 참석 응답",value:stats.totalRSVPs,icon:Users,color:"bg-emerald-50 text-emerald-500"},{label:"전체 방명록",value:stats.totalMessages,icon:MessageSquare,color:"bg-amber-50 text-amber-500"}].map((s)=>(
            <div key={s.label} className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm space-y-4"><div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${s.color}`}><s.icon size={24}/></div><div><p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{s.label}</p><p className="text-4xl font-black text-zinc-900">{s.value} {s.unit&&<span className="text-sm font-medium text-zinc-300">{s.unit}</span>}</p></div></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-6"><h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2 px-4"><FileText size={20} /> 최근 생성된 청첩장</h2>
            <div className="bg-white rounded-[40px] border border-zinc-100 shadow-sm overflow-hidden"><div className="divide-y divide-zinc-50">
              {recentInvitations.map((inv)=>(<div key={inv.id} className="p-6 flex items-center justify-between hover:bg-zinc-50/50 group"><div className="flex items-center gap-4"><div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white"><FileText size={18}/></div><div><p className="text-sm font-bold text-zinc-900">/{inv.slug}</p><p className="text-[10px] text-zinc-400 font-medium">생성: {new Date(inv.createdAt).toLocaleDateString()}</p></div></div><div className="flex items-center gap-4"><Link to={`/invitation/${inv.slug}`} className="p-2 text-zinc-300 hover:text-black"><ExternalLink size={16}/></Link></div></div>))}
            </div></div>
          </div>
          <div className="space-y-6"><h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2 px-4"><Users size={20} /> 최근 가입 사용자</h2>
            <div className="bg-white rounded-[40px] border border-zinc-100 shadow-sm overflow-hidden"><div className="divide-y divide-zinc-50">
              {users.map((u)=>(<div key={u.id} className="p-6 flex items-center justify-between hover:bg-zinc-50/50 group"><div className="flex items-center gap-4"><div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white"><UserCircle size={18}/></div><div><p className="text-sm font-bold text-zinc-900">{u.email}</p><p className="text-[10px] text-zinc-400 font-medium">가입: {new Date(u.createdAt).toLocaleDateString()}</p></div></div><div className="flex items-center gap-3"><span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${u.role==="ADMIN"?"bg-zinc-900 text-white":"bg-zinc-100 text-zinc-400"}`}>{u.role}</span><ArrowRight size={14} className="text-zinc-200 group-hover:text-black group-hover:translate-x-1 transition-all"/></div></div>))}
            </div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
