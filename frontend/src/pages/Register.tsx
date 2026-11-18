import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
type FormData = z.infer<typeof schema>;

export default function Register() {
  const { register: authRegister } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await authRegister(data.email, data.name, data.password);
      navigate("/");
    } catch {
      toast.error("Could not create account. Email may already be in use.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: "linear-gradient(135deg, #00386B 0%, #006591 40%, #003E46 100%)" }}>
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
          <h2 className="font-display text-2xl font-semibold text-[var(--color-on-surface)] mb-6">Create your account</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {[
              { name: "name", label: "Full name", type: "text", placeholder: "Alex Johnson", autocomplete: "name" },
              { name: "email", label: "Email", type: "email", placeholder: "you@company.com", autocomplete: "email" },
              { name: "password", label: "Password", type: "password", placeholder: "8+ characters", autocomplete: "new-password" },
              { name: "confirmPassword", label: "Confirm password", type: "password", placeholder: "••••••••", autocomplete: "new-password" },
            ].map(({ name, label, type, placeholder, autocomplete }) => (
              <div key={name}>
                <label className="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-1.5">{label}</label>
                <input
                  {...register(name as keyof FormData)}
                  type={type}
                  autoComplete={autocomplete}
                  placeholder={placeholder}
                  className="w-full bg-transparent border-0 border-b border-[var(--color-outline-variant)] pb-2 text-sm text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                />
                {errors[name as keyof FormData] && (
                  <p className="text-xs text-[var(--color-error)] mt-1">{errors[name as keyof FormData]?.message}</p>
                )}
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 rounded-md text-sm font-semibold font-body transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-[var(--color-on-surface-variant)]">
            Already have an account?{" "}
            <Link to="/login" className="text-[var(--color-primary)] hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
