import { useState } from "react";
import { api } from "@client/lib/api";

interface Props {
  onCreated: () => void;
}

export function CreateClassForm({ onCreated }: Props) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    const response = await api.classes.create({ name: name.trim() });
    if (response.success) {
      setName("");
      onCreated();
    } else {
      setError(response.error || "Failed to create class");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New class name"
        className="input-field flex-1"
        required
      />
      <button
        type="submit"
        disabled={loading || !name.trim()}
        className="btn-primary text-sm py-2 px-4 disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create"}
      </button>
      {error && <p className="text-xs text-paper-red">{error}</p>}
    </form>
  );
}
