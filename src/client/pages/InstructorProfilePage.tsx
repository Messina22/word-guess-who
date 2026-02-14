import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@client/context/AuthContext";
import { AuthModal } from "@client/components/auth/AuthModal";
import { api } from "@client/lib/api";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return "Unknown";
  }
  return date.toLocaleString();
}

export function InstructorProfilePage() {
  const { instructor, isAuthenticated, isLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">(
    "login"
  );

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const trimmedCurrentPassword = currentPassword.trim();
  const trimmedNewPassword = newPassword.trim();
  const trimmedConfirmPassword = confirmPassword.trim();

  const validationError = useMemo(() => {
    if (
      !trimmedCurrentPassword &&
      !trimmedNewPassword &&
      !trimmedConfirmPassword
    ) {
      return null;
    }
    if (!trimmedCurrentPassword || !trimmedNewPassword || !trimmedConfirmPassword) {
      return "All password fields are required.";
    }
    if (trimmedNewPassword.length < 8) {
      return "New password must be at least 8 characters.";
    }
    if (trimmedNewPassword !== trimmedConfirmPassword) {
      return "New password and confirmation must match.";
    }
    if (trimmedCurrentPassword === trimmedNewPassword) {
      return "New password must be different from current password.";
    }
    return null;
  }, [trimmedConfirmPassword, trimmedCurrentPassword, trimmedNewPassword]);

  async function handleChangePassword(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFormMessage(null);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsSaving(true);
    const response = await api.auth.changePassword({
      currentPassword: trimmedCurrentPassword,
      newPassword: trimmedNewPassword,
    });

    if (response.success && response.data) {
      setFormMessage(response.data.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setFormError(
        response.error ||
          response.errors?.join(", ") ||
          "Failed to change password."
      );
    }

    setIsSaving(false);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 sm:p-8 flex items-center justify-center">
        <p className="text-pencil/60">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authModalMode}
      />

      <header className="max-w-4xl mx-auto mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl text-pencil mb-2 text-shadow">
              Instructor Profile
            </h1>
            <p className="font-ui text-pencil/70">
              Manage your account details and security settings.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/instructor"
              className="btn-secondary text-center text-sm py-2 px-4"
            >
              Dashboard
            </Link>
            <Link to="/" className="btn-secondary text-center text-sm py-2 px-4">
              Home
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto space-y-6">
        {isAuthenticated && instructor ? (
          <>
            <section className="paper-card p-6">
              <h2 className="font-display text-2xl text-pencil mb-4">
                Account Details
              </h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-pencil/60">
                    Name
                  </dt>
                  <dd className="text-pencil font-ui">{instructor.name}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-pencil/60">
                    Email
                  </dt>
                  <dd className="text-pencil font-ui">{instructor.email}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-pencil/60">
                    Created
                  </dt>
                  <dd className="text-pencil/80 font-ui">
                    {formatDate(instructor.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-pencil/60">
                    Last Updated
                  </dt>
                  <dd className="text-pencil/80 font-ui">
                    {formatDate(instructor.updatedAt)}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="paper-card p-6">
              <h2 className="font-display text-2xl text-pencil mb-2">
                Change Password
              </h2>
              <p className="text-sm text-pencil/60 mb-4">
                Use at least 8 characters and keep your account secure.
              </p>

              {formMessage && (
                <div className="mb-4 p-3 bg-grass/10 text-grass rounded-lg text-sm">
                  {formMessage}
                </div>
              )}
              {(formError || validationError) && (
                <div className="mb-4 p-3 bg-paper-red/10 text-paper-red rounded-lg text-sm">
                  {formError || validationError}
                </div>
              )}

              <form className="space-y-4" onSubmit={handleChangePassword}>
                <div>
                  <label
                    htmlFor="currentPassword"
                    className="block font-ui text-sm text-pencil/70 mb-1"
                  >
                    Current Password
                  </label>
                  <input
                    id="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    className="input-field"
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label
                    htmlFor="newPassword"
                    className="block font-ui text-sm text-pencil/70 mb-1"
                  >
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="input-field"
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block font-ui text-sm text-pencil/70 mb-1"
                  >
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="input-field"
                    disabled={isSaving}
                  />
                </div>
                <div className="pt-1">
                  <button
                    type="submit"
                    className="btn-primary text-sm py-3 px-6"
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Update Password"}
                  </button>
                </div>
              </form>
            </section>
          </>
        ) : (
          <section className="paper-card p-6">
            <h2 className="font-display text-2xl text-pencil mb-2">
              Sign In Required
            </h2>
            <p className="text-sm text-pencil/70">
              Sign in to view your account details and change your password.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                className="btn-secondary text-sm py-2 px-4"
                onClick={() => {
                  setAuthModalMode("login");
                  setShowAuthModal(true);
                }}
              >
                Instructor Sign In
              </button>
              <button
                type="button"
                className="btn-secondary text-sm py-2 px-4"
                onClick={() => {
                  setAuthModalMode("register");
                  setShowAuthModal(true);
                }}
              >
                Create Account
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
