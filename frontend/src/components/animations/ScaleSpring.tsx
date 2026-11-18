import { useEffect, useRef, useState, type ReactNode } from "react";
import { spring, interpolate } from "remotion";
import { cn } from "@/lib/utils";

const FPS = 60;

interface ScaleSpringProps {
  children: ReactNode;
  className?: string;
  trigger?: unknown;
  /** Initial scale (default 0.92) */
  from?: number;
  /** Target scale (default 1) */
  to?: number;
  /** Duration in frames at 60fps (default 45 ≈ 750ms) */
  durationFrames?: number;
  /** Spring damping — higher = less bounce (default 14) */
  damping?: number;
  /** Spring stiffness (default 180) */
  stiffness?: number;
}

/**
 * Physics-based scale-in entrance animation using Remotion's spring() and
 * interpolate() math functions driven by requestAnimationFrame.
 *
 * Unlike a CSS transition, this uses true spring physics so the element
 * overshoots slightly and settles — matching the "alive" feel of the
 * Editorial Architect design system.
 */
export function ScaleSpring({
  children,
  className,
  trigger,
  from = 0.92,
  to = 1,
  durationFrames = 45,
  damping = 14,
  stiffness = 180,
}: ScaleSpringProps) {
  const [frame, setFrame] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    // Reset animation
    setFrame(0);
    startTimeRef.current = null;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    const animate = (time: number) => {
      if (!startTimeRef.current) startTimeRef.current = time;
      const elapsed = time - startTimeRef.current;
      const currentFrame = Math.floor((elapsed / 1000) * FPS);
      setFrame(currentFrame);
      if (currentFrame < durationFrames) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [trigger, durationFrames]);

  const scale = spring({
    frame,
    fps: FPS,
    config: { damping, stiffness, mass: 0.6 },
    from,
    to,
  });

  const opacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      className={cn(className)}
      style={{ transform: `scale(${scale})`, opacity, willChange: "transform, opacity" }}
    >
      {children}
    </div>
  );
}
