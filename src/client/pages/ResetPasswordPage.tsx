import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@client/lib/supabase";

export function ResetPasswordPage() {
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Supabase embeds the recovery token in the URL fragment (#access_token=...&type=recovery)
    // onAuthStateChange fires with SIGNED_IN when the recovery link is visited
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true);
      }
    });

    // Also check if we already have a recovery session active
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsValidSession(true);
      } else {
        // Give onAuthStateChange a moment to fire from URL hash
        setTimeout(() => {
          setIsValidSession((prev) => prev ?? false);
        }, 1000);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isValidSession === null) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <div className="paper-card p-8 w-full max-w-md text-center">
          <p className="text-pencil/70">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (!isValidSession) {
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
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (updateError) {
      setError(updateError.message || "Failed to reset password. The link may have expired.");
    } else {
      setSuccess(true);
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
