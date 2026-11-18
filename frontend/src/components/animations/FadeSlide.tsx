import { type ReactNode, useEffect, useRef, useState } from "react";
import { spring, interpolate } from "remotion";
import { cn } from "@/lib/utils";

const FPS = 60;

interface FadeSlideProps {
  children: ReactNode;
  direction?: "up" | "down" | "left" | "right";
  delay?: number;
  duration?: number;
  className?: string;
  trigger?: unknown;
}

const DIRECTION_AXIS: Record<string, "Y" | "X"> = {
  up: "Y", down: "Y", left: "X", right: "X",
};
const DIRECTION_SIGN: Record<string, number> = {
  up: 1, down: -1, left: 1, right: -1,
};

const DURATION_FRAMES = 40; // ~667ms at 60fps

/**
 * Fade + directional slide entrance powered by Remotion's spring() physics.
 * The `delay` prop (ms) staggers when the animation clock starts.
 */
export function FadeSlide({
  children,
  direction = "up",
  delay = 0,
  className,
  trigger,
}: FadeSlideProps) {
  const [frame, setFrame] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setFrame(0);
    startTimeRef.current = null;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    if (timerRef.current !== null) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      const animate = (time: number) => {
        if (!startTimeRef.current) startTimeRef.current = time;
        const elapsed = time - startTimeRef.current;
        const f = Math.floor((elapsed / 1000) * FPS);
        setFrame(f);
        if (f < DURATION_FRAMES) {
          rafRef.current = requestAnimationFrame(animate);
        }
      };
      rafRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [trigger, delay]);

  const progress = spring({
    frame,
    fps: FPS,
    config: { damping: 18, stiffness: 160, mass: 0.7 },
    from: 0,
    to: 1,
  });

  const opacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });

  const offsetPx = 14;
  const axis = DIRECTION_AXIS[direction];
  const sign = DIRECTION_SIGN[direction];
  const translate = interpolate(progress, [0, 1], [offsetPx * sign, 0]);

  return (
    <div
      className={cn(className)}
      style={{
        opacity,
        transform: `translate${axis}(${translate}px)`,
        willChange: "transform, opacity",
      }}
    >
      {children}
    </div>
  );
}
