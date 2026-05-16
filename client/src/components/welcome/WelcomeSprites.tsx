export function PacManSprite() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <circle cx="22" cy="22" r="18" fill="#FFE000" />
      <polygon points="22,22 40,12 40,32" fill="#000" />
      <circle cx="22" cy="12" r="3" fill="#000" />
    </svg>
  );
}

function GhostSprite({ fill }: { fill: string }) {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <path
        d="M4 22 C4 10 10 4 22 4 C34 4 40 10 40 22 L40 40 L34 34 L28 40 L22 34 L16 40 L10 34 L4 40 Z"
        fill={fill}
      />
      <circle cx="16" cy="20" r="4.5" fill="white" />
      <circle cx="28" cy="20" r="4.5" fill="white" />
      <circle cx="17.5" cy="21.5" r="2.5" fill="#222D9E" />
      <circle cx="29.5" cy="21.5" r="2.5" fill="#222D9E" />
    </svg>
  );
}

export function BlinkySprite() {
  return <GhostSprite fill="#FF0000" />;
}
export function PinkySprite() {
  return <GhostSprite fill="#FFB8FF" />;
}
export function InkySprite() {
  return <GhostSprite fill="#00CCDD" />;
}
export function ClydeSprite() {
  return <GhostSprite fill="#FF8000" />;
}
