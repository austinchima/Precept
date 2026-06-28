import { useRef, type ReactNode, type CSSProperties } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "../../lib/animations";

interface TextRevealProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  stagger?: number;
  duration?: number;
  delay?: number;
  start?: string;
  once?: boolean;
}

export function TextReveal({
  children,
  className = "",
  style,
  stagger = 0.05,
  duration = 0.6,
  delay = 0,
  start = "top 85%",
  once = true,
}: TextRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      if (!ref.current) return;

      const text = ref.current.innerText;
      if (!text) return;

      const html = text
        .split(/\s+/)
        .map(
          (word) =>
            `<span class="inline-block overflow-hidden"><span class="inline-block reveal-word">${word}</span></span>`
        )
        .join(" ");

      ref.current.innerHTML = html;

      const scrollerEl = typeof document !== 'undefined' ? document.getElementById('main-scroller') : null;
      gsap.from(gsap.utils.selector(ref.current)(".reveal-word"), {
        y: "100%",
        opacity: 0,
        duration,
        delay,
        stagger,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ref.current,
          start,
          once,
          ...(scrollerEl && document.contains(scrollerEl) ? { scroller: scrollerEl } : {}),
        },
      });
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
