import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateWorkspace } from "@/api/workspaces";
import { useAppStore } from "@/hooks/useAppStore";
import { toast } from "sonner";
import { Building2, Plus, ArrowRight, Sparkles } from "lucide-react";

export default function WorkspaceOnboarding() {
  const navigate = useNavigate();
  const { mutateAsync: createWorkspace, isPending } = useCreateWorkspace();
  const { setActiveWorkspace } = useAppStore();
  const [name, setName] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const ws = await createWorkspace(trimmed);
      setActiveWorkspace(ws.id);
      toast.success(`Workspace "${ws.name}" created!`);
      navigate("/");
    } catch {
      toast.error("Failed to create workspace. Please try again.");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #00386B 0%, #006591 40%, #003E46 100%)" }}
    >
      {/* Ambient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #29C4D9, transparent)" }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-15" style={{ background: "radial-gradient(circle, #8DC63F, transparent)" }} />
        <div className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #F5B82E, transparent)" }} />
      </div>

      <div className="relative z-10 w-full max-w-lg mx-4">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-bold text-white tracking-tight">Lively</h1>
          <p className="text-white/60 mt-2 text-sm font-body">Your team's workspace</p>
        </div>

        <div className="card-nested p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--color-accent-teal)" }}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold text-[var(--color-on-surface)]">Get started</h2>
              <p className="text-xs text-[var(--color-on-surface-variant)] font-body">Create your first workspace to begin collaborating</p>
            </div>
          </div>

          <div className="h-px bg-[var(--color-outline-variant)] my-6" />

          {/* Create workspace form */}
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-1.5 uppercase tracking-wider">
                Workspace name
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-3 py-2.5 focus-within:border-[var(--color-primary)] transition-colors">
                <Building2 className="w-4 h-4 text-[var(--color-outline)] flex-shrink-0" />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="flex-1 bg-transparent text-sm text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] focus:outline-none font-body"
                  autoFocus
                  maxLength={100}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "var(--color-primary)" }}
            >
              {isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create workspace
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-[var(--color-outline-variant)]" />
            <span className="text-xs text-[var(--color-on-surface-variant)] font-body">or</span>
            <div className="flex-1 h-px bg-[var(--color-outline-variant)]" />
          </div>

          {/* Join via invite */}
          <div className="rounded-lg border border-[var(--color-outline-variant)] p-4 space-y-2">
            <p className="text-sm font-medium text-[var(--color-on-surface)] font-display">Join an existing workspace</p>
            <p className="text-xs text-[var(--color-on-surface-variant)] font-body leading-relaxed">
              Ask a workspace admin to invite you by email. Once they send the invite, you'll receive a link to join directly.
            </p>
            <div className="flex items-center gap-1.5 pt-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-accent-teal)" }} />
              <span className="text-xs text-[var(--color-on-surface-variant)] font-body">Invite links expire after 72 hours</span>
            </div>
          </div>
        </div>

        {/* Footer hint */}
        <p className="text-center text-white/40 text-xs font-body mt-6">
          You can create or join multiple workspaces at any time from the sidebar.
        </p>
      </div>
    </div>
  );
}
