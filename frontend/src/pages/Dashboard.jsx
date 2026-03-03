import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, ExternalLink, Edit2, Calendar, MapPin, LayoutDashboard, ShieldCheck, Trash2 } from "lucide-react";
import { useAuth } from "../lib/auth";
import api from "../lib/api";
import { toThumbnailUrl } from "../lib/imageUrl";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get("/invitations/my").then((res) => setInvitations(res.data.invitations)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const openDeleteModal = (invitation) => {
    setDeleteTarget(invitation);
    setDeleteInput("");
    setDeleteError("");
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeleteTarget(null);
    setDeleteInput("");
    setDeleteError("");
  };

  const handleDeleteInvitation = async () => {
    const invitationId = deleteTarget?.id;
    const slug = String(deleteTarget?.slug || "").trim();
    if (!invitationId || !slug) return;
    if (deleteInput.trim() !== slug) {
      setDeleteError("슬러그가 일치하지 않습니다.");
      return;
    }
    try {
      setDeleting(true);
      const res = await api.post(`/invitations/${invitationId}/delete`);
      if (!res.data?.success) {
        setDeleteError(res.data?.error || "삭제에 실패했습니다.");
        return;
      }
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
      closeDeleteModal();
      alert("청첩장을 삭제했습니다.");
    } catch (e) {
      setDeleteError(e.response?.data?.error || e.message || "삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  const [deleteAccountTarget, setDeleteAccountTarget] = useState(false);
  const [deleteAccountInput, setDeleteAccountInput] = useState("");
  const [deleteAccountError, setDeleteAccountError] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteAccountInput !== "탈퇴하겠습니다") {
      setDeleteAccountError("'탈퇴하겠습니다'를 정확히 입력해 주세요.");
      return;
    }
    try {
      setDeletingAccount(true);
      const res = await api.delete("/auth/account");
      alert(res.data?.message || "회원 탈퇴가 완료되었습니다.");
      localStorage.clear();
      window.location.href = "/";
    } catch (e) {
      setDeleteAccountError(e.response?.data?.error || "탈퇴 처리 중 오류가 발생했습니다.");
    } finally {
      setDeletingAccount(false);
    }
  };

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-zinc-400 text-sm">로딩 중...</div></div>;

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header Section */}
        <div className="border-b border-zinc-200 pb-10 mb-8 space-y-6 md:space-y-0 md:flex md:justify-between md:items-end">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-zinc-900 tracking-tight">내 청첩장 관리</h1>
            <div className="flex items-center gap-4">
              <p className="text-zinc-500 text-lg">{user?.email}님, 반갑습니다.</p>
              <button
                onClick={() => setDeleteAccountTarget(true)}
                className="text-[11px] text-zinc-300 hover:text-red-400 underline underline-offset-4 transition-colors font-medium"
              >
                회원 탈퇴
              </button>
            </div>
          </div>
          <div className="flex gap-3">
            {!authLoading && user?.role === "ADMIN" && <Link to="/admin" className="flex items-center gap-2 px-4 py-2 border border-zinc-200 bg-white text-zinc-600 rounded-xl hover:bg-zinc-50 transition-all font-bold text-xs uppercase tracking-widest shadow-sm"><ShieldCheck size={16} /> 사이트 관리</Link>}
            <Link to="/builder" className="flex items-center gap-2 px-5 py-3 bg-black text-white rounded-xl hover:bg-zinc-800 transition-colors shadow-lg shadow-black/10 font-bold text-xs uppercase tracking-widest leading-none"><Plus size={18} /> 새 청첩장 만들기</Link>
          </div>
        </div>

        {invitations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[32px] border-2 border-dashed border-zinc-200 text-zinc-400 space-y-6">
            <Plus size={48} className="opacity-10" />
            <div className="text-center space-y-2">
              <p className="text-zinc-500 font-medium text-lg">아직 작성된 청첩장이 없습니다.</p>
              <Link to="/builder" className="text-black font-bold underline underline-offset-8 decoration-2 hover:text-zinc-600 transition-colors">첫 청첩장을 만들어보세요</Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {invitations.map((inv) => (
              <div key={inv.id} className="group bg-white rounded-[32px] border border-zinc-100 shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden flex flex-col">
                <div className="relative aspect-[4/3] bg-zinc-100">
                  {inv.mainPhotoUrl ? <img src={toThumbnailUrl(inv.mainPhotoUrl)} alt="Thumb" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" onError={(e) => { if (e.currentTarget.dataset.fallback === "1") return; e.currentTarget.dataset.fallback = "1"; e.currentTarget.src = inv.mainPhotoUrl; }} /> : <div className="absolute inset-0 flex items-center justify-center text-zinc-300">사진 없음</div>}
                  <div className="absolute top-5 left-5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase text-zinc-800 shadow-sm border border-white/20">/{inv.slug}</div>
                </div>
                <div className="p-8 flex-1 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-zinc-800 tracking-tight">{inv.groomName} & {inv.brideName}</h3>
                    <div className="space-y-2 text-sm text-zinc-500">
                      <div className="flex items-center gap-2.5"><Calendar size={16} className="text-zinc-300" /><span>{new Date(inv.weddingDate).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}</span></div>
                      <div className="flex items-center gap-2.5"><MapPin size={16} className="text-zinc-300" /><span className="truncate">{inv.venueName}</span></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <a
                      href={`/invitation/${inv.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-3 bg-zinc-50 rounded-2xl text-[11px] font-bold text-zinc-600 hover:bg-zinc-100 transition-colors border border-zinc-100 uppercase tracking-widest"
                    >
                      <ExternalLink size={14} /> 보기
                    </a>
                    <Link to={`/builder?slug=${inv.slug}`} className="flex items-center justify-center gap-2 py-3 bg-zinc-50 rounded-2xl text-[11px] font-bold text-zinc-600 hover:bg-zinc-100 transition-colors border border-zinc-100 uppercase tracking-widest"><Edit2 size={14} /> 수정</Link>
                    <Link to={`/dashboard/${inv.id}`} className="col-span-2 flex items-center justify-center gap-2 py-4 bg-zinc-900 rounded-2xl text-[11px] font-bold text-white hover:bg-black transition-all shadow-lg shadow-black/5 uppercase tracking-[0.25em]"><LayoutDashboard size={14} /> 관리</Link>
                    <button
                      type="button"
                      onClick={() => openDeleteModal(inv)}
                      className="col-span-2 flex items-center justify-center gap-2 py-3 bg-red-50/50 rounded-2xl text-[11px] font-bold text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors border border-red-50 uppercase tracking-widest mt-1"
                    >
                      <Trash2 size={14} /> 영구 삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Invitation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="삭제 모달 닫기"
            onClick={closeDeleteModal}
            className="absolute inset-0 bg-black/45"
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl border border-zinc-200 p-6 space-y-4"
          >
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-zinc-900">청첩장 삭제</h2>
              <p className="text-sm text-zinc-600">삭제 후 복구할 수 없습니다.</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-zinc-700">
                삭제하려면 아래 슬러그를 정확히 입력하세요.
              </p>
              <p className="text-sm font-mono rounded-lg bg-zinc-100 px-3 py-2 text-zinc-800">
                {deleteTarget.slug}
              </p>
              <input
                type="text"
                value={deleteInput}
                onChange={(e) => {
                  setDeleteInput(e.target.value);
                  if (deleteError) setDeleteError("");
                }}
                placeholder="슬러그 입력"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
              />
              {deleteError ? <p className="text-xs text-red-600">{deleteError}</p> : null}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-zinc-300 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDeleteInvitation}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {deleteAccountTarget && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => setDeleteAccountTarget(false)}
            className="absolute inset-0 bg-black/45"
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl border border-zinc-200 p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-red-800 text-center">정말 탈퇴하시겠습니까?</h2>
              <p className="text-sm text-zinc-600 text-center">
                탈퇴 즉시 모든 데이터가 삭제되며 전면 복구가 불가능합니다.
              </p>
            </div>
            <div className="space-y-3">
              <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                <p className="text-xs text-zinc-500 mb-2 font-medium">확인을 위해 다음 문구를 입력해 주세요:</p>
                <p className="text-base font-bold text-zinc-800 text-center mb-4 italic">탈퇴하겠습니다</p>
                <input
                  type="text"
                  value={deleteAccountInput}
                  onChange={(e) => {
                    setDeleteAccountInput(e.target.value);
                    if (deleteAccountError) setDeleteAccountError("");
                  }}
                  placeholder="문구 입력"
                  className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 text-center font-bold"
                />
              </div>
              {deleteAccountError ? <p className="text-xs text-red-600 text-center font-medium">{deleteAccountError}</p> : null}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteAccountTarget(false)}
                disabled={deletingAccount}
                className="flex-1 py-3 rounded-xl border border-zinc-200 text-sm font-bold text-zinc-500 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="flex-1 py-3 rounded-xl bg-red-600 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50 shadow-lg shadow-red-200 transition-all font-bold"
              >
                {deletingAccount ? "처리 중..." : "최종 탈퇴"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
