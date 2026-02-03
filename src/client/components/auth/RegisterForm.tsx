import { useState } from "react";
import { useAuth } from "@client/context/AuthContext";

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin: () => void;
}

export function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    if (password !== confirmPassword) {
      setErrors(["Passwords do not match"]);
      return;
    }

    setIsLoading(true);

    const result = await register({ email, password, name });
    setIsLoading(false);

    if (result.success) {
      onSuccess?.();
    } else {
      setErrors(result.errors);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="register-name" className="block font-ui text-sm text-pencil/70 mb-1">
          Name
        </label>
        <input
          id="register-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-field"
          required
          autoComplete="name"
        />
      </div>

      <div>
        <label htmlFor="register-email" className="block font-ui text-sm text-pencil/70 mb-1">
          Email
        </label>
        <input
          id="register-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field"
          required
          autoComplete="email"
        />
      </div>

      <div>
        <label htmlFor="register-password" className="block font-ui text-sm text-pencil/70 mb-1">
          Password
        </label>
        <input
          id="register-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-field"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <p className="text-xs text-pencil/60 mt-1">At least 8 characters</p>
      </div>

      <div>
        <label htmlFor="register-confirm" className="block font-ui text-sm text-pencil/70 mb-1">
          Confirm Password
        </label>
        <input
          id="register-confirm"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="input-field"
          required
          autoComplete="new-password"
        />
      </div>

      {errors.length > 0 && (
        <div className="p-3 bg-paper-red/10 text-paper-red rounded-lg text-sm">
          <ul className="list-disc list-inside space-y-1">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Creating account..." : "Create Account"}
      </button>

      <p className="text-center text-sm text-pencil/70">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-crayon-blue underline hover:no-underline"
        >
          Sign in
        </button>
      </p>
    </form>
  );
}
