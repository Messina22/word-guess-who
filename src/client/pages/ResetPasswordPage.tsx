import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "@client/lib/api";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <div className="paper-card p-8 w-full max-w-md text-center">
          <h1 className="font-display text-2xl text-pencil mb-4">Invalid Reset Link</h1>
          <p className="text-pencil/70 mb-6">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <Link to="/instructor" className="btn-primary inline-block">
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <div className="paper-card p-8 w-full max-w-md text-center">
          <h1 className="font-display text-2xl text-pencil mb-4">Password Reset</h1>
          <div className="p-4 bg-crayon-green/10 text-crayon-green rounded-lg mb-6">
            Your password has been reset successfully.
          </div>
          <Link to="/instructor" className="btn-primary inline-block">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);
    const result = await api.auth.resetPassword(token, password);
    setIsLoading(false);

    if (result.success) {
      setSuccess(true);
    } else {
      setError(
        result.error ||
          (result.errors?.length ? result.errors.join(". ") : null) ||
          "Failed to reset password. The link may have expired."
      );
    }
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="paper-card p-8 w-full max-w-md">
        <h1 className="font-display text-2xl text-pencil mb-6 text-center">Set New Password</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="block font-ui text-sm text-pencil/70 mb-1">
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              required
              minLength={8}
              autoComplete="new-password"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="block font-ui text-sm text-pencil/70 mb-1">
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field"
              required
              minLength={8}
              autoComplete="new-password"
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
            {isLoading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
