import { useEffect, useState } from "react";
import { api } from "@client/lib/api";
import { CreateClassForm } from "./CreateClassForm";
import type { Class } from "@shared/types";

interface Props {
  selectedClassId: string | null;
  onSelectClass: (id: string) => void;
}

export function ClassList({ selectedClassId, onSelectClass }: Props) {
  const [classes, setClasses] = useState<
    (Class & { studentCount: number })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    const response = await api.classes.list();
    if (response.success && response.data) {
      setClasses(response.data);
    } else {
      setError(response.error || "Failed to load classes");
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <section className="paper-card p-6">
      <h2 className="font-display text-xl text-pencil mb-4">My Classes</h2>

      <CreateClassForm onCreated={refresh} />

      {loading && (
        <p className="text-sm text-pencil/60 mt-4">Loading classes...</p>
      )}

      {!loading && error && (
        <div className="mt-4 p-3 bg-paper-red/10 text-paper-red rounded-lg text-sm">
          <p>{error}</p>
          <button type="button" onClick={refresh} className="underline text-xs mt-2">
            Retry
          </button>
        </div>
      )}

      {!loading && classes.length === 0 && !error && (
        <p className="text-sm text-pencil/60 mt-4">
          No classes yet. Create one above to get started.
        </p>
      )}

      <div className="space-y-3 mt-4">
        {classes.map((cls) => (
          <button
            key={cls.id}
            type="button"
            onClick={() => onSelectClass(cls.id)}
            className={`w-full text-left rounded-lg border-2 p-3 transition ${
              cls.id === selectedClassId
                ? "border-crayon-blue bg-crayon-blue/10"
                : "border-kraft/40 hover:border-kraft/60"
            }`}
          >
            <h3 className="font-display text-lg text-pencil">{cls.name}</h3>
            <p className="text-xs text-pencil/60">
              {cls.studentCount} student{cls.studentCount !== 1 ? "s" : ""} |
              Code: <span className="font-mono">{cls.joinCode}</span>
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
