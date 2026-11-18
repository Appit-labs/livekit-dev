import { type ReactNode } from "react";
import { FadeSlide } from "./FadeSlide";

interface ListStaggerProps {
  items: ReactNode[];
  staggerMs?: number;
  baseDelay?: number;
  className?: string;
  itemClassName?: string;
  trigger?: unknown;
}

export function ListStagger({ items, staggerMs = 50, baseDelay = 0, className, itemClassName, trigger }: ListStaggerProps) {
  return (
    <div className={className}>
      {items.map((item, i) => (
        <FadeSlide
          key={i}
          delay={baseDelay + i * staggerMs}
          direction="up"
          duration={250}
          className={itemClassName}
          trigger={trigger}
        >
          {item}
        </FadeSlide>
      ))}
    </div>
  );
}
