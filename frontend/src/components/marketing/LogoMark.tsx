export default function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="#2563eb" />
      <path
        d="M8 16C10 12 14 10 18 10C22 10 26 12 24 16C22 20 18 22 14 22C10 22 6 20 8 16Z"
        fill="white"
        opacity="0.95"
      />
      <circle cx="16" cy="16" r="3" fill="#2563eb" />
    </svg>
  );
}
