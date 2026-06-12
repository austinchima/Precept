# Quiz Mode Design Overrides (Page Specification)

This specification overrides or details the Master Design System rules specifically for the `/story-bank/quiz` route.

---

## 1. Immersive Fullscreen Portal
Quiz mode is a dedicated memory retrieval sequence, requiring focus and minimal distraction:
* **Stack Layering**: Renders on a full-screen backdrop overlay (`fixed inset-0 z-[100]`).
* **Visual Atmosphere**: Subtle background aurora/mesh gradients (`bg-brand-primary/[0.02] blur-3xl`) with 1px border lines to replicate a high-tech console HUD.

---

## 2. Interactive Speech Recognition Indicators
* **Listening State**: When Speech Recognition is active, the recording button must pulse (`animate-pulse`) and use a soft translucent rose background (`bg-rose-500/20 text-rose-400 border-rose-500/40`).
* **Microphone Icon**: Toggle state between `<Mic />` and `<MicOff />` dynamically with active hover cursor styles.

---

## 3. Self-Assessment Hotkeys / Cards
The self-assessment options correspond to the three retrieval results:
* **Nailed It**: Hovering transforms card border to green (`hover:border-[#4ade80] hover:bg-[#4ade80]/5`) and morphs check icon colors.
* **Partial Recall**: Hovering transforms card border to amber (`hover:border-[#fbbf24] hover:bg-[#fbbf24]/5`) and morphs question icon colors.
* **Critical Failure**: Hovering transforms card border to red (`hover:border-[#f87171] hover:bg-[#f87171]/5`) and morphs alert/panic icon colors.
* **Transitions**: State shifts on selecting a choice must be smooth (`transition-all duration-200 ease-out`).
