/** Sagoma generica mostrata quando un'auto non ha ancora foto. */
export function CarArt({ className = 'w-3/5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 110" className={className} aria-hidden="true">
      <path d="M16 78V64q0-7 9-9l34-7 20-22q4-5 11-5h52q8 0 14 6l20 21 25 6q12 3 12 14v10z" fill="#01427F" />
      <path d="M82 46l14-16h46q4 0 7 3l14 13z" fill="#DCE4F0" />
      <circle cx="68" cy="80" r="15" fill="#0B2A5B" />
      <circle cx="68" cy="80" r="6" fill="#FFC21A" />
      <circle cx="178" cy="80" r="15" fill="#0B2A5B" />
      <circle cx="178" cy="80" r="6" fill="#FFC21A" />
    </svg>
  );
}
