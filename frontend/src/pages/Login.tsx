import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Required"),
  totp_code: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await login(data.email, data.password, data.totp_code);
      navigate("/");
    } catch {
      toast.error("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: "linear-gradient(135deg, #00386B 0%, #006591 40%, #003E46 100%)" }}>
      {/* Mesh gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #29C4D9, transparent)" }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-15" style={{ background: "radial-gradient(circle, #8DC63F, transparent)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10" style={{ background: "radial-gradient(circle, #F5B82E, transparent)" }} />
      </div>

      <div className="relative z-10 w-full max-w-sm mx-4">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-bold text-white tracking-tight">Lively</h1>
          <p className="text-white/60 mt-2 text-sm font-body">Your team's workspace</p>
        </div>

        <div className="card-nested p-8">
          <h2 className="font-display text-2xl font-semibold text-[var(--color-on-surface)] mb-6">Welcome back</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-1.5">Email</label>
              <input
                {...register("email")}
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                className="w-full bg-transparent border-0 border-b border-[var(--color-outline-variant)] pb-2 text-sm text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
              {errors.email && <p className="text-xs text-[var(--color-error)] mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-1.5">Password</label>
              <input
                {...register("password")}
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full bg-transparent border-0 border-b border-[var(--color-outline-variant)] pb-2 text-sm text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
              {errors.password && <p className="text-xs text-[var(--color-error)] mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 rounded-md text-sm font-semibold font-body transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--color-outline-variant)]" />
            <span className="text-xs text-[var(--color-on-surface-variant)]">or</span>
            <div className="flex-1 h-px bg-[var(--color-outline-variant)]" />
          </div>

          <div className="mt-4 space-y-2">
            <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md bg-[var(--color-surface-container)] text-sm text-[var(--color-on-surface)] font-body hover:bg-[var(--color-surface-container-high)] transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-[var(--color-on-surface-variant)]">
            No account?{" "}
            <Link to="/register" className="text-[var(--color-primary)] hover:underline font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
