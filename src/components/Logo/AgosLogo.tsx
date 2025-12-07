export function AgosLogo({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="50" cy="50" r="48" fill="#1e40af" stroke="#3b82f6" strokeWidth="2"/>

      <path
        d="M50 20 L58 35 L73 37 L61.5 48 L64 63 L50 55 L36 63 L38.5 48 L27 37 L42 35 Z"
        fill="#fbbf24"
        stroke="#f59e0b"
        strokeWidth="1.5"
      />

      <path
        d="M30 70 Q35 65 40 68 Q45 71 50 68 Q55 65 60 68 Q65 71 70 66"
        stroke="#60a5fa"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      <path
        d="M28 78 Q33 73 38 76 Q43 79 48 76 Q53 73 58 76 Q63 79 68 74 Q71 71 72 74"
        stroke="#93c5fd"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      <circle cx="50" cy="35" r="3" fill="#fef3c7"/>
      <circle cx="42" cy="37" r="2" fill="#fef3c7"/>
      <circle cx="58" cy="37" r="2" fill="#fef3c7"/>

      <text
        x="50"
        y="92"
        fontFamily="Arial, sans-serif"
        fontSize="14"
        fontWeight="bold"
        fill="#ffffff"
        textAnchor="middle"
      >
        AGOS
      </text>
    </svg>
  );
}
