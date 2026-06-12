# Dashboard Design Overrides (Page Specification)

This specification overrides or details the Master Design System rules specifically for the `/dashboard` route.

---

## 1. Bento Grid Metrics
The dashboard metrics overview uses an Apple/Linear-style Bento Grid layout:
* **Grid Layout**: 4-column responsive grid (`grid-cols-1 md:grid-cols-2 xl:grid-cols-4`).
* **Hover State**: Cards must lift slightly (`hover:border-brand-primary/30`) and scale (`hover:scale-[1.01] transition-transform`).
* **Icons**: Icon background containers must expand or scale slightly (`group-hover:scale-110 transition-transform`).

---

## 2. Compact Action Items Table
The "Overdue Follow-ups" table acts as a critical list of action items.
* **Overdue Alert Coloring**: Overdue rows use a translucent red background (`bg-[#f87171]/5`) and a border-accent matching the alert red.
* **Row Highlight**: Hovering over rows must highlight them with a slight background color change (`hover:bg-brand-surface-high/50`).
* **Button Spacing**: Action execution buttons must have a clear hover feedback container (`hover:bg-brand-primary/15 hover:text-brand-primary`).

---

## 3. Quick Command Triggers
* **Interactive Borders**: Dashed card borders (`border-dashed`) should change to solid brand colors on focus or hover (`hover:border-solid hover:border-brand-primary`).
