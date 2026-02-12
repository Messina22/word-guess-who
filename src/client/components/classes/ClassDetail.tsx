import { useEffect, useState } from "react";
import { api } from "@client/lib/api";
import type { ClassWithRoster } from "@shared/types";

interface Props {
  classId: string;
}

export function ClassDetail({ classId }: Props) {
  const [classData, setClassData] = useState<ClassWithRoster | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const refresh = async () => {
    setLoading(true);
    setError(null);
    const response = await api.classes.get(classId);
    if (response.success && response.data) {
      setClassData(response.data);
    } else {
      setError(response.error || "Failed to load class");
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, [classId]);

  const handleRemoveStudent = async (studentId: string, username: string) => {
    if (!window.confirm(`Remove ${username} from this class?`)) return;
    setDeleteError(null);
    const response = await api.classes.removeStudent(classId, studentId);
    if (response.success) {
      refresh();
    } else {
      setDeleteError(response.error || "Failed to remove student");
    }
  };

  const handleDeleteClass = async () => {
    if (!window.confirm("Delete this class and all its students? This cannot be undone."))
      return;
    const response = await api.classes.delete(classId);
    if (response.success) {
      // Reload to clear selection — parent will handle
      window.location.reload();
    } else {
      setDeleteError(response.error || "Failed to delete class");
    }
  };

  const handleSaveName = async () => {
    if (!nameInput.trim() || !classData) return;
    const response = await api.classes.update(classId, {
      name: nameInput.trim(),
    });
    if (response.success) {
      setEditingName(false);
      refresh();
    }
  };

  if (loading) {
    return (
      <div className="paper-card p-6">
        <p className="text-sm text-pencil/60">Loading class...</p>
      </div>
    );
  }

  if (error || !classData) {
    return (
      <div className="paper-card p-6">
        <p className="text-sm text-paper-red">{error || "Class not found"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="paper-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            {editingName ? (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="input-field"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  className="btn-primary text-xs py-2 px-3"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingName(false)}
                  className="btn-secondary text-xs py-2 px-3"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <h2
                className="font-display text-2xl text-pencil cursor-pointer hover:text-crayon-blue"
                onClick={() => {
                  setNameInput(classData.name);
                  setEditingName(true);
                }}
                title="Click to edit name"
              >
                {classData.name}
              </h2>
            )}
          </div>
          <button
            type="button"
            onClick={handleDeleteClass}
            className="btn-danger text-xs py-2 px-3"
          >
            Delete Class
          </button>
        </div>

        <div className="mt-4 p-4 bg-paper-cream/50 rounded-lg">
          <p className="text-sm text-pencil/70 mb-1">
            Class Join Code (share with students):
          </p>
          <p className="font-mono text-2xl text-pencil tracking-widest bg-white/50 px-4 py-3 rounded border border-kraft/30 text-center">
            {classData.joinCode}
          </p>
        </div>
      </section>

      <section className="paper-card p-6">
        <h3 className="font-display text-xl text-pencil mb-4">
          Students ({classData.students.length})
        </h3>

        {deleteError && (
          <div className="mb-4 p-3 bg-paper-red/10 text-paper-red rounded-lg text-sm">
            {deleteError}
          </div>
        )}

        {classData.students.length === 0 ? (
          <p className="text-sm text-pencil/60">
            No students have joined yet. Share the join code above with your
            students.
          </p>
        ) : (
          <div className="space-y-2">
            {classData.students.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between p-3 rounded-lg border border-kraft/30"
              >
                <div>
                  <p className="font-ui text-sm text-pencil font-medium">
                    {student.username}
                  </p>
                  {student.lastSeenAt && (
                    <p className="text-xs text-pencil/50">
                      Last seen{" "}
                      {new Date(student.lastSeenAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleRemoveStudent(student.id, student.username)
                  }
                  className="btn-danger text-xs py-1 px-3"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
