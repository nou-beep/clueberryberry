/** Clueberry's mark: a berry with a pencil-tip leaf. */
export function Logo({ size = 40 }: { size?: number }) {
  const L = "#4a3339";
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden
      className="shrink-0"
    >
      <g stroke={L} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
        {/* berry */}
        <path d="M24 43c-8 0-14-6.5-14-14 0-5 6-9 14-9s14 4 14 9c0 7.5-6 14-14 14z" fill="#ff7fae" />
        <path d="M24 43c8 0 14-6.5 14-14 0 4.5-6 8-14 8s-14-3.5-14-8c0 7.5 6 14 14 14z" fill="rgba(74,51,57,0.14)" stroke="none" />
        {/* leaf / pencil tip */}
        <path d="M14 17h20l-4.5 6h-11z" fill="#7fd1ae" />
        <path d="M24 8v9" />
        <path d="M20.5 8h7l-3.5-5z" fill="#ffe28a" />
        {/* seeds */}
        <g fill="#ffe28a" stroke="none">
          <circle cx="19" cy="30" r="1.5" />
          <circle cx="28" cy="28" r="1.5" />
          <circle cx="24" cy="35" r="1.5" />
          <circle cx="32" cy="34" r="1.5" />
        </g>
        {/* gloss */}
        <ellipse cx="18" cy="26" rx="3.5" ry="2.4" fill="rgba(255,255,255,0.55)" stroke="none" />
      </g>
    </svg>
  );
}
