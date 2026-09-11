export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="10" className="fill-primary-container" />
      <path
        d="M12 28V12L20 20L28 12V28"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="25" r="2.5" className="fill-secondary-container" />
    </svg>
  );
}
