import { useState } from "react";
import { api } from "@client/lib/api";

interface ForgotPasswordFormProps {
  onSwitchToLogin: () => void;
}

export function ForgotPasswordForm({ onSwitchToLogin }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const result = await api.auth.forgotPassword(email);
    setIsLoading(false);

    if (result.success) {
      setSubmitted(true);
    } else {
      setError(result.error || "Something went wrong. Please try again.");
    }
  };

  if (submitted) {
    return (
      <div className="space-y-4 text-center">
        <div className="p-4 bg-crayon-green/10 text-crayon-green rounded-lg">
          <p className="font-semibold mb-1">Check your inbox</p>
          <p className="text-sm">
            If an account exists for <strong>{email}</strong>, we've sent a password reset link.
          </p>
        </div>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-crayon-blue underline hover:no-underline text-sm"
        >
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-pencil/70">
        Enter your email address and we'll send you a link to reset your password.
      </p>

      <div>
        <label htmlFor="forgot-email" className="block font-ui text-sm text-pencil/70 mb-1">
          Email
        </label>
        <input
          id="forgot-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field"
          required
          autoComplete="email"
          autoFocus
        />
      </div>

      {error && (
        <div className="p-3 bg-paper-red/10 text-paper-red rounded-lg text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Sending..." : "Send Reset Link"}
      </button>

      <p className="text-center text-sm text-pencil/70">
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-crayon-blue underline hover:no-underline"
        >
          Back to Sign In
        </button>
      </p>
    </form>
  );
}
