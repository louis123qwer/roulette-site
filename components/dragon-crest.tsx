import type { CSSProperties } from "react";

export function DragonCrest({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 120 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <path
        d="M110,58 L85,40 L78,25 L82,5 L70,28 L60,2 L52,30 L25,15 L40,42 L15,40 L35,55 L10,62 L30,75 L45,90 L55,72 L62,88 L72,68 L80,82 L95,65 Z"
        fill="currentColor"
      />
      <circle cx="72" cy="37" r="4" fill="var(--background)" />
    </svg>
  );
}
