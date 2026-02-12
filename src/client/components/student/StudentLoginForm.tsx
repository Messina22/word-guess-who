import { useState } from "react";
import { useStudent } from "@client/context/StudentContext";

export function StudentLoginForm() {
  const {
    isStudentAuthenticated,
    student,
    className,
    studentLogin,
    studentLogout,
    isLoading,
  } = useStudent();

  const [classCode, setClassCode] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) return null;

  if (isStudentAuthenticated && student) {
    return (
      <div className="paper-card p-4 flex items-center justify-between gap-4">
        <div>
          <p className="font-ui text-sm text-pencil">
            Signed in as <strong>{student.username}</strong> in{" "}
            <strong>{className}</strong>
          </p>
        </div>
        <button
          type="button"
          onClick={studentLogout}
          className="btn-secondary text-xs py-2 px-3"
        >
          Sign Out
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await studentLogin({
      classCode: classCode.trim(),
      username: username.trim(),
    });

    if (!result.success) {
      setError(result.error);
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="paper-card p-4">
      <h3 className="font-display text-lg text-pencil mb-3 text-center">
        Student Sign In
      </h3>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={classCode}
          onChange={(e) => setClassCode(e.target.value)}
          placeholder="Class code"
          className="input-field flex-1"
          required
        />
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Your name"
          className="input-field flex-1"
          required
        />
        <button
          type="submit"
          disabled={submitting || !classCode.trim() || !username.trim()}
          className="btn-primary text-sm py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Joining..." : "Join Class"}
        </button>
      </div>
      {error && (
        <p className="text-xs text-paper-red mt-2">{error}</p>
      )}
      <p className="text-xs text-pencil/50 mt-2 text-center">
        Enter the class code from your teacher to sign in.
      </p>
    </form>
  );
}
