import { ArrowRight } from 'lucide-react';

interface TemplateItem {
  key: string;
  title: string;
  meta?: string;
  body: string;
}

/** Starter templates shown when a bank is empty: a compact two-column list, not a wall of cards. */
export function TemplateList({ items, onUse }: { items: TemplateItem[]; onUse: (key: string) => void }) {
  return (
    <section aria-labelledby="templates-heading">
      <h2 id="templates-heading" className="text-[14px] font-medium text-fg">Start from a template</h2>
      <p className="mt-1 text-[13px] text-fg-3">Templates are examples. Replace the details with your own work before you rely on them.</p>
      <ul className="mt-4 grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-2">
        {items.map((item) => (
          <li key={item.key} className="bg-surface-1">
            <button
              type="button"
              onClick={() => onUse(item.key)}
              className="group flex h-full w-full flex-col gap-1.5 p-4 text-left transition-colors hover:bg-surface-2"
            >
              <span className="flex w-full items-start justify-between gap-3">
                <span className="text-[14px] font-medium text-fg">{item.title}</span>
                <ArrowRight size={15} className="mt-0.5 shrink-0 text-fg-3 transition-transform group-hover:translate-x-0.5 group-hover:text-fg" />
              </span>
              {item.meta && <span className="text-[12.5px] text-fg-3">{item.meta}</span>}
              <span className="line-clamp-2 text-[13px] leading-relaxed text-fg-2">{item.body}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
