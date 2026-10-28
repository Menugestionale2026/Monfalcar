import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { useId } from 'react';

interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}

function FieldShell({ label, hint, error, required, children }: FieldShellProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined;
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
        {required && <span className="text-brand-blue"> *</span>}
      </label>
      {children({ id, describedBy, invalid: !!error })}
      {hint && (
        <p id={hintId} className="hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} role="alert" className="mt-1 text-[13px] font-semibold text-[#B42318]">
          {error}
        </p>
      )}
    </div>
  );
}

type Common = { label: string; hint?: string; error?: string | null };

export function TextField({
  label,
  hint,
  error,
  ...rest
}: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={rest.required}>
      {({ id, describedBy, invalid }) => (
        <input id={id} className="input" aria-describedby={describedBy} aria-invalid={invalid || undefined} {...rest} />
      )}
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  ...rest
}: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={rest.required}>
      {({ id, describedBy, invalid }) => (
        <textarea id={id} className="input" aria-describedby={describedBy} aria-invalid={invalid || undefined} {...rest} />
      )}
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  error,
  children,
  ...rest
}: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={rest.required}>
      {({ id, describedBy, invalid }) => (
        <select id={id} className="input" aria-describedby={describedBy} aria-invalid={invalid || undefined} {...rest}>
          {children}
        </select>
      )}
    </FieldShell>
  );
}

export function CheckField({
  children,
  error,
  ...rest
}: { children: ReactNode; error?: string | null } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const id = useId();
  return (
    <div>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          className="mt-1 h-5 w-5 shrink-0 accent-[#01427F]"
          aria-invalid={!!error || undefined}
          {...rest}
        />
        <label htmlFor={id} className="text-[15px] leading-snug">
          {children}
        </label>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-[13px] font-semibold text-[#B42318]">
          {error}
        </p>
      )}
    </div>
  );
}

/** Campo trappola per i robot: le persone non lo vedono né lo compilano. */
export function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
      <label>
        Non compilare questo campo
        <input type="text" tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const phoneOk = (v: string) => v.replace(/[^\d]/g, '').length >= 6;
