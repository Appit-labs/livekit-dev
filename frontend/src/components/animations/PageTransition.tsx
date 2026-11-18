import { type ReactNode, useEffect, useRef, useState } from "react";
import { spring, interpolate } from "remotion";

const FPS = 60;
const EXIT_FRAMES = 12;  // ~200ms
const ENTER_FRAMES = 28; // ~467ms

/**
 * Page-level view transition using Remotion spring physics.
 * When the key changes: exit (fade+slide down) → swap content → enter (fade+slide up).
 */
export function PageTransition({
  children,
  transitionKey,
}: {
  children: ReactNode;
  transitionKey: string;
}) {
  const [phase, setPhase] = useState<"idle" | "exit" | "enter">("idle");
  const [displayChildren, setDisplayChildren] = useState(children);
  const [frame, setFrame] = useState(0);

  const prevKey = useRef(transitionKey);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const startAnimation = (targetPhase: "exit" | "enter") => {
    setPhase(targetPhase);
    setFrame(0);
    startTimeRef.current = null;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    const maxFrames = targetPhase === "exit" ? EXIT_FRAMES : ENTER_FRAMES;
    const animate = (time: number) => {
      if (!startTimeRef.current) startTimeRef.current = time;
      const elapsed = time - startTimeRef.current;
      const f = Math.floor((elapsed / 1000) * FPS);
      setFrame(f);
      if (f < maxFrames) {
        rafRef.current = requestAnimationFrame(animate);
      } else if (targetPhase === "exit") {
        // Swap content then start enter
        setDisplayChildren(children);
        startAnimation("enter");
      } else {
        setPhase("idle");
      }
    };
    rafRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (transitionKey === prevKey.current) return;
    prevKey.current = transitionKey;
    startAnimation("exit");
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transitionKey]);

  // Update displayed children when key matches (idle state)
  useEffect(() => {
    if (phase === "idle") setDisplayChildren(children);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children, phase]);

  let opacity = 1;
  let translateY = 0;

  if (phase === "exit") {
    opacity = interpolate(frame, [0, EXIT_FRAMES], [1, 0], { extrapolateRight: "clamp" });
    translateY = interpolate(frame, [0, EXIT_FRAMES], [0, 6], { extrapolateRight: "clamp" });
  } else if (phase === "enter") {
    opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
    const progress = spring({
      frame,
      fps: FPS,
      config: { damping: 20, stiffness: 180, mass: 0.7 },
      from: 0,
      to: 1,
    });
    translateY = interpolate(progress, [0, 1], [10, 0]);
  }

  return (
    <div
      className="h-full w-full"
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        willChange: "transform, opacity",
      }}
    >
      {displayChildren}
    </div>
  );
}
