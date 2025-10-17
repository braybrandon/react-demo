type Props = {
  onClick?: () => void;
  size?: number;
};

export default function Logo({ onClick, size = 28 }: Props) {
  // Use Vite-compatible URL for static asset inside src/assets
  const xpIcon = new URL("../assets/xp-icon.png", import.meta.url).href;

  return (
    <button
      onClick={onClick}
      aria-label="XPFit home"
      style={{
        background: "transparent",
        border: 0,
        padding: 0,
        display: "flex",
        alignItems: "center",
        gap: 8,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <img src={xpIcon} alt="XP icon" width={size} height={size} style={{ borderRadius: 6 }} />
      <svg
        height={size}
        viewBox="0 0 50 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <linearGradient id="gText" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#00d4ff" />
            <stop offset="50%" stopColor="#6b46ff" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <text
          x="0"
          y="22"
          fontFamily="Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial"
          fontWeight="700"
          fontSize="20"
          fill="url(#gText)"
        >
          XPFit
        </text>
      </svg>
    </button>
  );
}
