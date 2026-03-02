import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../lib/api";
import InvitationView from "../components/InvitationView";

export default function Invitation() {
  const { slug } = useParams();
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    api.get(`/invitations/slug/${slug}`).then((res) => setInvitation(res.data.invitation)).catch(() => setNotFound(true)).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-zinc-100"><div className="text-zinc-400 text-sm">로딩 중...</div></div>;
  if (notFound || !invitation) return <div className="min-h-screen flex items-center justify-center bg-zinc-100"><div className="text-center space-y-4"><h1 className="text-2xl font-bold text-zinc-900">페이지를 찾을 수 없습니다</h1><p className="text-zinc-500">해당 청첩장이 존재하지 않습니다.</p></div></div>;

  const config = typeof invitation.config === "string" ? JSON.parse(invitation.config || "{}") : (invitation.config || {});
  const templateBg = { modern: "#f1f5f9", classic: "#faf6f1", elegant: "#1a1a1a" };
  const bgColor = config.bgColor || templateBg[invitation.template] || "#f1f5f9";

  return (
    <main style={{ backgroundColor: bgColor, minHeight: "100vh" }} className="min-h-screen flex justify-center selection:bg-zinc-200 transition-colors duration-1000 overflow-x-hidden">
      <div
        className="flex justify-center"
        style={{
          transform: "none",
          transformOrigin: "top center",
          width: "100%",
          maxWidth: "100vw",
        }}
      >
        <InvitationView data={invitation} template={invitation.template || "modern"} isPreview={false} syncCoverRender />
      </div>
    </main>
  );
}
