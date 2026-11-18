import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useInvitePreview, useAcceptInvite } from "@/api/workspaces";
import { useAppStore } from "@/hooks/useAppStore";
import { toast } from "sonner";
import { Users, Clock, AlertCircle, CheckCircle, LogIn } from "lucide-react";

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { setActiveWorkspace } = useAppStore();

  const { data: preview, isLoading: previewLoading, isError } = useInvitePreview(token ?? "");
  const { mutateAsync: acceptInvite, isPending: accepting } = useAcceptInvite();

  const handleAccept = async () => {
    if (!token) return;
    try {
      const workspace = await acceptInvite(token);
      setActiveWorkspace(workspace.id);
      toast.success(`You've joined "${workspace.name}"!`);
      navigate("/");
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? "Failed to accept invite";
      toast.error(msg);
    }
  };

  if (authLoading || previewLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #00386B 0%, #006591 40%, #003E46 100%)" }}>
        <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isInvalid = isError || !preview?.valid;

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #00386B 0%, #006591 40%, #003E46 100%)" }}
    >
      {/* Ambient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #29C4D9, transparent)" }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-15" style={{ background: "radial-gradient(circle, #8DC63F, transparent)" }} />
      </div>

      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-bold text-white tracking-tight">Lively</h1>
          <p className="text-white/60 mt-2 text-sm font-body">Your team's workspace</p>
        </div>

        <div className="card-nested p-8">
          {isInvalid ? (
            /* Invalid / expired invite */
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{ background: "rgba(220, 53, 69, 0.1)" }}>
                <AlertCircle className="w-7 h-7" style={{ color: "var(--color-error)" }} />
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold text-[var(--color-on-surface)]">Invite not found</h2>
                <p className="text-sm text-[var(--color-on-surface-variant)] font-body mt-2 leading-relaxed">
                  This invite link is invalid, expired, or has already been used. Ask your admin for a fresh invite.
                </p>
              </div>
              <button
                onClick={() => navigate("/")}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
                style={{ background: "var(--color-primary)" }}
              >
                Go to app
              </button>
            </div>
          ) : (
            /* Valid invite */
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "var(--color-primary)" }}>
                  <span className="font-display font-bold text-white text-lg">
                    {preview.workspace_name[0]?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-on-surface-variant)] font-body uppercase tracking-wider">You're invited to</p>
                  <h2 className="font-display text-xl font-semibold text-[var(--color-on-surface)]">{preview.workspace_name}</h2>
                </div>
              </div>

              <div className="rounded-lg bg-[var(--color-surface-container)] p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-[var(--color-on-surface-variant)] font-body">
                  <Users className="w-3.5 h-3.5" />
                  <span>Invite sent to <strong className="text-[var(--color-on-surface)]">{preview.email}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--color-on-surface-variant)] font-body">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Expires {new Date(preview.expires_at).toLocaleDateString()}</span>
                </div>
              </div>

              {isAuthenticated ? (
                <button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
                  style={{ background: "var(--color-accent-teal)" }}
                >
                  {accepting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Accept invite & join
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-center text-[var(--color-on-surface-variant)] font-body">
                    You need to be logged in to accept this invite.
                  </p>
                  <button
                    onClick={() => navigate(`/login?redirect=/invite/${token}`)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
                    style={{ background: "var(--color-primary)" }}
                  >
                    <LogIn className="w-4 h-4" />
                    Log in to accept
                  </button>
                  <button
                    onClick={() => navigate(`/register?redirect=/invite/${token}`)}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold text-[var(--color-on-surface)] border border-[var(--color-outline-variant)] transition-all hover:bg-[var(--color-surface-container)]"
                  >
                    Create an account
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
