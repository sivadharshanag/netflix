import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import styles from "./LoginPage.module.css";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!password) {
      setError("Enter the birthday passcode.");
      return;
    }
    setSubmitting(true);
    setError(undefined);
    const result = await login(password);
    setSubmitting(false);
    if (result.success) {
      navigate("/profiles");
    } else {
      setError(result.message ?? "That's not quite it. Try again.");
    }
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.card} onSubmit={onSubmit} aria-describedby={error ? "login-error" : undefined}>
        <p className={styles.eyebrow}>Some stories are meant for special people.</p>
        <h1 className={styles.heading}>Enter the birthday passcode to continue</h1>

        <div className={styles.fieldWrap}>
          <input
            className={styles.input}
            type={visible ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Passcode"
            aria-label="Birthday passcode"
            aria-invalid={Boolean(error)}
            autoFocus
            autoComplete="off"
          />
          <button
            type="button"
            className={styles.toggleVisibility}
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide passcode" : "Show passcode"}
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <p id="login-error" className={styles.error} role="alert">
          {error}
        </p>

        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? "Checking..." : "Continue"}
        </button>
      </form>
    </div>
  );
}
