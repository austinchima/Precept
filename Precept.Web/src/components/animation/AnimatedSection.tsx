import { useRef, type ReactNode } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "../../lib/animations";

type AnimationType = "fadeUp" | "staggerFadeUp" | "scaleIn" | "slideLeft" | "slideRight";

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  animation?: AnimationType;
  stagger?: number;
  delay?: number;
  duration?: number;
  start?: string;
  once?: boolean;
  childSelector?: string;
}

export function AnimatedSection({
  children,
  className = "",
  animation = "fadeUp",
  stagger = 0.1,
  delay = 0,
  duration = 0.8,
  start = "top 85%",
  once = true,
  childSelector,
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;

      const selectorStr = childSelector
        ? (childSelector.trim().startsWith(">")
            ? `:scope ${childSelector.trim()}`
            : childSelector)
        : undefined;

      const target = selectorStr
        ? gsap.utils.selector(ref.current)(selectorStr)
        : ref.current;

      if (!target || (target instanceof NodeList && target.length === 0)) return;

      // Authenticated app shell scrolls inside #main-scroller; landing uses window.
      const scrollerEl = typeof document !== 'undefined' ? document.getElementById('main-scroller') : null;

      const baseFrom: Record<string, gsap.TweenValue> = { opacity: 0 };
      const baseTo: Record<string, gsap.TweenValue> = { opacity: 1 };

      switch (animation) {
        case "fadeUp":
          baseFrom.y = 40;
          baseTo.y = 0;
          break;
        case "staggerFadeUp":
          baseFrom.y = 30;
          baseTo.y = 0;
          break;
        case "scaleIn":
          baseFrom.scale = 0.95;
          baseTo.scale = 1;
          break;
        case "slideLeft":
          baseFrom.x = -60;
          baseTo.x = 0;
          break;
        case "slideRight":
          baseFrom.x = 60;
          baseTo.x = 0;
          break;
      }

      const toVars: gsap.TweenVars = {
        ...baseTo,
        duration,
        delay,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ref.current,
          start,
          once,
          ...(scrollerEl && document.contains(scrollerEl) ? { scroller: scrollerEl } : {}),
        },
      };

      if (animation === "staggerFadeUp" && childSelector) {
        toVars.stagger = stagger;
      }

      gsap.fromTo(target, baseFrom, toVars);
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
