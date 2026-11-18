import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center">
      <div className="text-center">
        <p className="font-display text-8xl font-bold text-[var(--color-primary)] opacity-20 mb-4">404</p>
        <h1 className="font-display text-2xl font-semibold text-[var(--color-on-surface)] mb-2">Page not found</h1>
        <p className="text-[var(--color-on-surface-variant)] text-sm mb-6">The page you're looking for doesn't exist.</p>
        <Link to="/" className="btn-primary px-6 py-2.5 rounded-md text-sm font-semibold font-body inline-block hover:opacity-90">
          Go home
        </Link>
      </div>
    </div>
  );
}
