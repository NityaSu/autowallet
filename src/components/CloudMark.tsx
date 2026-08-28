export function CloudMark({
  width = 34,
  height = 22,
  className,
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 42 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="AutoWallet"
    >
      <path
        d="M12 20C5.373 20 0 15.523 0 10C0 4.477 5.373 0 12 0C14.5 0 16.8 0.7 18.7 2C20.5 0.8 22.7 0 25 0C31.627 0 37 4.477 37 10C37 10.5 36.95 11 36.85 11.5C39.6 12.8 41.5 15.5 41.5 18.5C41.5 23.2 37.8 27 33 27H12C5.373 27 0 22.627 0 17C0 14.5 1 12.2 2.8 10.5"
        fill="rgba(45,24,14,0.1)"
        stroke="rgba(45,24,14,0.55)"
        strokeWidth="1.4"
      />
      <circle cx="14" cy="8" r="2.2" fill="rgba(45,24,14,0.35)" />
      <circle cx="22" cy="6" r="1.6" fill="rgba(45,24,14,0.25)" />
    </svg>
  );
}
