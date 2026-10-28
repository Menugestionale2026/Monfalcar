import type { ReactNode } from 'react';
import { errorMessage } from '../lib/errors';

export function Loading({ label = 'Caricamento…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-brand-muted" role="status">
      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {label}
    </div>
  );
}

export function ErrorNotice({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-[#F2B8B5] bg-[#FDECEA] p-4 text-[#8A1C13]">
      <p className="font-semibold">{errorMessage(error)}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-2 text-sm font-semibold underline">
          Riprova
        </button>
      )}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-brand-line bg-brand-mist px-6 py-12 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-brand-muted">{children}</div>}
    </div>
  );
}

export function SuccessNotice({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div role="status" className="rounded-xl border border-[#9AD7AE] bg-[#E8F7ED] p-5 text-[#14532D]">
      <p className="font-display text-lg font-semibold">{title}</p>
      {children && <div className="mt-1">{children}</div>}
    </div>
  );
}
