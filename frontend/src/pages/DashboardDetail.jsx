import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Users, MessageSquare, Calendar, MapPin, ExternalLink, Trash2, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "../lib/auth";
import api from "../lib/api";

export default function DashboardDetail() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/invitations/${id}`).then((res) => setInvitation(res.data.invitation)).catch(() => navigate("/dashboard")).finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading || !invitation) return <div className="min-h-screen flex items-center justify-center"><div className="text-zinc-400 text-sm">로딩 중...</div></div>;

  const totalGuests = invitation.attendance.reduce((acc, curr) => acc + (curr.attending ? curr.count : 0), 0);
  const totalMealGuests = invitation.attendance.reduce((acc, curr) => acc + (curr.attending && curr.meal ? (curr.mealCount ?? curr.count ?? 0) : 0), 0);
  const attendingCount = invitation.attendance.filter((v) => v.attending).length;

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col gap-6">
          <Link to="/dashboard" className="flex items-center gap-2 text-zinc-500 hover:text-black transition-colors group"><ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" /><span>대시보드로 돌아가기</span></Link>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-zinc-200 pb-8">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-zinc-900">{invitation.groomName} & {invitation.brideName}</h1>
              <div className="flex flex-wrap gap-4 text-sm text-zinc-500">
                <span className="flex items-center gap-1.5"><Calendar size={14} /> {new Date(invitation.weddingDate).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}</span>
                <span className="flex items-center gap-1.5"><MapPin size={14} /> {invitation.venueName}</span>
              </div>
            </div>
            <div className="flex gap-3">
              {!authLoading && user?.role === "ADMIN" && <Link to="/admin" className="px-4 py-2.5 bg-zinc-100 text-zinc-500 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 transition-all flex items-center gap-2"><ShieldCheck size={16} /> 사이트 관리</Link>}
              <a
                href={`/invitation/${invitation.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-semibold hover:bg-zinc-50 transition-all shadow-sm flex items-center gap-2"
              >
                <ExternalLink size={16} /> 링크 보기
              </a>
              <Link to={`/builder?slug=${invitation.slug}`} className="px-4 py-2.5 bg-black text-white rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-all shadow-lg shadow-black/10 flex items-center gap-2"><Users size={16} /> 수정하기</Link>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm space-y-2"><p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">총 하객 수</p><p className="text-4xl font-bold text-zinc-900">{totalGuests} <span className="text-lg font-medium text-zinc-400">명</span></p></div>
          <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm space-y-2"><p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">참석 응답 수</p><p className="text-4xl font-bold text-zinc-900">{attendingCount} <span className="text-lg font-medium text-zinc-400">건</span></p></div>
          <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm space-y-2"><p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">식사 인원</p><p className="text-4xl font-bold text-zinc-900">{totalMealGuests} <span className="text-lg font-medium text-zinc-400">명</span></p></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2"><Users size={20} /> 참석 명단</h2>
            <div className="bg-white rounded-[32px] border border-zinc-100 shadow-sm overflow-hidden">
              {invitation.attendance.length === 0 ? <div className="p-20 text-center text-zinc-400"><p>아직 응답한 하객이 없습니다.</p></div> : (
                <div className="divide-y divide-zinc-50 text-sm">
                  {invitation.attendance.map((entry) => (
                    <div key={entry.id} className="p-6 flex justify-between items-center hover:bg-zinc-50/50">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2"><span className="font-bold text-zinc-900">{entry.name}</span><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${entry.side === "GROOM" ? "bg-blue-50 text-blue-500" : "bg-pink-50 text-pink-500"}`}>{entry.side === "GROOM" ? "신랑측" : "신부측"}</span></div>
                        <div className="text-zinc-500 flex items-center gap-3">
                          <span>{entry.attending ? `${entry.count}인 참석` : "불참"}</span>
                          {entry.attending && entry.meal && <span>식사 {entry.mealCount ?? entry.count}명</span>}
                          {entry.message && <><span className="text-zinc-300">|</span><span className="truncate max-w-[150px] italic">"{entry.message}"</span></>}
                        </div>
                      </div>
                      {entry.attending ? <CheckCircle2 size={20} className="text-emerald-500" /> : <XCircle size={20} className="text-rose-500" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2"><MessageSquare size={20} /> 축하 메시지</h2>
            <div className="space-y-4">
              {invitation.guestbook.length === 0 ? <div className="bg-white rounded-[32px] border border-zinc-100 shadow-sm p-20 text-center text-zinc-400"><p>아직 남겨진 메시지가 없습니다.</p></div> : (
                invitation.guestbook.map((msg) => (
                  <div key={msg.id} className="bg-white p-6 rounded-[24px] border border-zinc-100 shadow-sm space-y-4 hover:shadow-md">
                    <div className="flex justify-between items-start"><div className="space-y-1"><p className="font-bold text-zinc-900">{msg.writerName}</p><p className="text-[10px] text-zinc-400 font-medium">{new Date(msg.createdAt).toLocaleString("ko-KR")}</p></div><button className="text-zinc-200 hover:text-red-500 transition-colors p-1"><Trash2 size={16} /></button></div>
                    <p className="text-sm text-zinc-600 leading-relaxed">{msg.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
