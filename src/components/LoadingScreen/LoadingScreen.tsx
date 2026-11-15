export function LoadingScreen({ label = "Loading..." }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "var(--bg-deep)",
        color: "var(--text-secondary)",
        fontSize: "0.95rem",
        letterSpacing: "0.05em",
      }}
    >
      {label}
    </div>
  );
}
