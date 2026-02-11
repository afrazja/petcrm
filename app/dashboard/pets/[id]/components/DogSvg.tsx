export default function DogSvg() {
  return (
    <g>
      {/* Body */}
      <ellipse
        cx="200"
        cy="180"
        rx="110"
        ry="65"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Neck */}
      <path
        d="M290 155 C305 140, 315 120, 320 105"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M280 170 C300 160, 320 140, 330 120"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Head */}
      <ellipse
        cx="340"
        cy="90"
        rx="35"
        ry="30"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Snout */}
      <ellipse
        cx="370"
        cy="95"
        rx="18"
        ry="12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Nose */}
      <circle cx="385" cy="93" r="3" fill="currentColor" />

      {/* Eye */}
      <circle cx="345" cy="82" r="3" fill="currentColor" />

      {/* Ear */}
      <path
        d="M320 70 C315 50, 325 35, 340 45"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Tail */}
      <path
        d="M90 155 C65 130, 50 110, 55 85"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M55 85 C53 75, 58 68, 65 72"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Front legs */}
      <path
        d="M250 230 L255 270 Q255 280 248 280 L240 280"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M230 232 L232 270 Q232 280 225 280 L217 280"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Back legs */}
      <path
        d="M150 228 L145 255 Q140 268, 135 270 Q132 280 138 280 L148 280"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M170 230 L168 255 Q165 268, 160 270 Q157 280 163 280 L173 280"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Belly line */}
      <path
        d="M155 240 Q200 250, 245 238"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
    </g>
  );
}
