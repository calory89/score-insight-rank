// RealHunt mark (1-oct-2026): a house with an upward arrow. Homes, ranked up by people.
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg className="rh-logo" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#FF5A1F" />
      <path d="M32 12 L53 31 Q55 33 52.5 33 L49 33 L49 50 Q49 53 46 53 L18 53 Q15 53 15 50 L15 33 L11.5 33 Q9 33 11 31 Z" fill="#fff" />
      <path d="M32 24 L41 34 L35.5 34 L35.5 45 L28.5 45 L28.5 34 L23 34 Z" fill="#FF5A1F" />
    </svg>
  );
}
