import { useRef, useEffect, useState } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "../../lib/animations";

interface CountUpProps {
  end: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  start?: number;
}

export function CountUp({
  end,
  duration = 1.5,
  className = "",
  prefix = "",
  suffix = "",
  start = 0,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [displayValue, setDisplayValue] = useState(start);

  useGSAP(
    () => {
      if (!ref.current) return;

      if (prefersReducedMotion()) {
        setDisplayValue(end);
        return;
      }

      const scrollerEl = typeof document !== 'undefined' ? document.getElementById('main-scroller') : null;
      const obj = { value: start };
      gsap.to(obj, {
        value: end,
        duration,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 90%",
          once: true,
          ...(scrollerEl && document.contains(scrollerEl) ? { scroller: scrollerEl } : {}),
        },
        onUpdate: () => {
          setDisplayValue(Math.round(obj.value));
        },
      });
    },
    { scope: ref, dependencies: [end] }
  );

  return (
    <span ref={ref} className={className}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
}
