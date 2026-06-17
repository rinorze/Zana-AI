import Image from "next/image";

const NATIVE_W = 2527;
const NATIVE_H = 2412;

export function ZanaLogo({
  className = "h-12 w-auto",
  height = 48,
}: {
  className?: string;
  height?: number;
}) {
  const width = Math.round((NATIVE_W / NATIVE_H) * height);
  return (
    <Image
      src="/zana-logo.png"
      alt="ZANA"
      width={width}
      height={height}
      priority
      className={className}
    />
  );
}

export function ZanaMark({ className = "h-9 w-9" }: { className?: string }) {
  // Inline SVG mark mirroring the brand silhouette — used inside the chat answer
  // bubble and other tight spots where the full logotype is overkill.
  return (
    <svg className={className} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="zanaMarkGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1d61a1" />
          <stop offset="100%" stopColor="#0c4f91" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="16" r="13" fill="url(#zanaMarkGrad)" />
      <circle cx="32" cy="48" r="13" fill="url(#zanaMarkGrad)" />
      <rect x="26" y="16" width="12" height="32" fill="url(#zanaMarkGrad)" />
      <path d="M22 19h20l-16 24h18" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity=".95" />
    </svg>
  );
}
