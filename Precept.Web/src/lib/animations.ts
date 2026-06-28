import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

// Register GSAP plugins once
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

export { gsap, ScrollTrigger, useGSAP };

/** Check if user prefers reduced motion */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Standard fade-up animation for scroll-triggered sections */
export function fadeUp(
  elements: gsap.TweenTarget,
  options?: gsap.TweenVars
): gsap.core.Tween {
  if (prefersReducedMotion()) {
    return gsap.set(elements, { opacity: 1, y: 0 });
  }
  return gsap.from(elements, {
    opacity: 0,
    y: 40,
    duration: 0.8,
    ease: "power3.out",
    ...options,
  });
}

/** Staggered fade-up animation for lists/grids */
export function staggerFadeUp(
  elements: gsap.TweenTarget,
  stagger = 0.1,
  options?: gsap.TweenVars
): gsap.core.Tween {
  if (prefersReducedMotion()) {
    return gsap.set(elements, { opacity: 1, y: 0 });
  }
  return gsap.from(elements, {
    opacity: 0,
    y: 30,
    duration: 0.7,
    ease: "power3.out",
    stagger,
    ...options,
  });
}

/** Scale-in animation for cards/panels */
export function scaleIn(
  elements: gsap.TweenTarget,
  options?: gsap.TweenVars
): gsap.core.Tween {
  if (prefersReducedMotion()) {
    return gsap.set(elements, { opacity: 1, scale: 1 });
  }
  return gsap.from(elements, {
    opacity: 0,
    scale: 0.95,
    duration: 0.7,
    ease: "back.out(1.2)",
    ...options,
  });
}

/** Magnetic button effect setup */
export function setupMagneticButton(
  el: HTMLElement,
  strength = 0.3
): () => void {
  if (prefersReducedMotion() || !el) return () => {};

  const onMove = (e: MouseEvent) => {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    gsap.to(el, {
      x: x * strength,
      y: y * strength,
      duration: 0.3,
      ease: "power2.out",
    });
  };

  const onLeave = () => {
    gsap.to(el, {
      x: 0,
      y: 0,
      duration: 0.5,
      ease: "elastic.out(1, 0.3)",
    });
  };

  el.addEventListener("mousemove", onMove);
  el.addEventListener("mouseleave", onLeave);

  return () => {
    el.removeEventListener("mousemove", onMove);
    el.removeEventListener("mouseleave", onLeave);
  };
}

/** Refresh ScrollTrigger (useful after layout changes) */
export function refreshScrollTrigger(): void {
  if (typeof window !== "undefined") {
    ScrollTrigger.refresh();
  }
}
