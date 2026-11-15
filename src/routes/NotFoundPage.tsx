import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="page container" style={{ display: "grid", placeItems: "center", textAlign: "center", gap: 16 }}>
      <h1 style={{ fontSize: "2rem" }}>Lost the plot.</h1>
      <p style={{ color: "var(--text-secondary)" }}>This page doesn't exist.</p>
      <Link to="/" className="btn" style={{ color: "var(--accent)" }}>
        Back to the beginning
      </Link>
    </div>
  );
}
