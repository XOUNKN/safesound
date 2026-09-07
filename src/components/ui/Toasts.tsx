"use client";

import { dismissToast, useStore } from "@/lib/store";
import { IconCheck, IconClose, IconInfo, IconWarning } from "./Icons";

const TONE = {
  success: { icon: <IconCheck size={17} />, color: "text-[var(--success)]" },
  error: { icon: <IconWarning size={17} />, color: "text-[var(--danger)]" },
  info: { icon: <IconInfo size={17} />, color: "text-[var(--accent)]" },
} as const;

export default function Toasts() {
  const toasts = useStore((s) => s.toasts);
  if (!toasts.length) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[120] flex flex-col items-center gap-2 px-3 pb-[calc(var(--nav-h)+var(--mini-h)+1rem)] sm:items-end sm:px-5 lg:pb-[calc(var(--mini-h)+1.25rem)]"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const tone = TONE[t.tone];
        return (
          <div
            key={t.id}
            className="animate-toast pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[var(--r-md)] bg-[var(--surface-3)] px-4 py-3 shadow-[var(--shadow-lg)]"
          >
            <span className={`mt-0.5 shrink-0 ${tone.color}`}>{tone.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.875rem] leading-snug font-medium text-[var(--text)]">{t.message}</p>
              {t.hint && (
                <p className="mt-0.5 text-[0.75rem] leading-snug text-[var(--text-dim)]">{t.hint}</p>
              )}
            </div>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action?.run();
                  dismissToast(t.id);
                }}
                className="shrink-0 rounded-lg px-2 py-1 text-[0.8125rem] font-semibold text-[var(--accent)] hover:bg-[var(--surface-3)]"
              >
                {t.action.label}
              </button>
            )}
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismissToast(t.id)}
              className="-mr-1 shrink-0 rounded-lg p-1 text-[var(--text-mute)] hover:text-[var(--text)]"
            >
              <IconClose size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
