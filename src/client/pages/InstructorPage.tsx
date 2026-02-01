import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@client/lib/api";
import { WordCard } from "@client/components/game/WordCard";
import type { GameConfig, GameConfigInput, QuestionCategory } from "@shared/types";
import { generateIdFromName } from "@shared/validation";

const questionCategories: QuestionCategory[] = [
  "letters",
  "sounds",
  "length",
  "patterns",
  "meaning",
];

const defaultSettings = {
  gridSize: 24,
  allowCustomQuestions: true,
  turnTimeLimit: 0,
  showPhoneticHints: false,
  enableSounds: true,
};

function normalizeName(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return "Unknown";
  }
  return date.toLocaleDateString();
}

function buildDraftFromConfig(config: GameConfig): GameConfigInput {
  return {
    id: config.id,
    name: config.name,
    description: config.description,
    author: config.author,
    wordBank: config.wordBank.map((entry) => ({ ...entry })),
    suggestedQuestions: config.suggestedQuestions.map((question) => ({ ...question })),
    settings: { ...config.settings },
  };
}

function createEmptyDraft(author?: string): GameConfigInput {
  return {
    name: "",
    description: "",
    author: author?.trim() || undefined,
    wordBank: [],
    suggestedQuestions: [],
    settings: { ...defaultSettings },
  };
}

function normalizeDraft(input: GameConfigInput, fallbackAuthor: string): GameConfigInput {
  const trimmedAuthor = (input.author ?? fallbackAuthor).trim();
  return {
    ...input,
    id: input.id?.trim() || undefined,
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    author: trimmedAuthor || undefined,
    wordBank: input.wordBank.map((entry) => ({
      ...entry,
      word: entry.word.trim(),
    })),
    suggestedQuestions: input.suggestedQuestions.map((question) => ({
      ...question,
      text: question.text.trim(),
    })),
  };
}

export function InstructorPage() {
  const [configs, setConfigs] = useState<GameConfig[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [instructorName, setInstructorName] = useState(
    () => localStorage.getItem("instructorName") ?? ""
  );
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [draftSourceId, setDraftSourceId] = useState<string | null>(null);
  const [draft, setDraft] = useState<GameConfigInput | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [newWords, setNewWords] = useState("");
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionCategory, setNewQuestionCategory] =
    useState<QuestionCategory>("letters");
  const [bulkQuestions, setBulkQuestions] = useState("");
  const [bulkQuestionCategory, setBulkQuestionCategory] =
    useState<QuestionCategory>("letters");

  const activeConfig = useMemo(
    () => configs.find((config) => config.id === draftSourceId) ?? null,
    [configs, draftSourceId]
  );

  const isOwner = useMemo(() => {
    if (!activeConfig) {
      return false;
    }
    const owner = normalizeName(activeConfig.author);
    const current = normalizeName(instructorName);
    return owner !== "" && owner === current;
  }, [activeConfig, instructorName]);

  const isReadOnly = Boolean(draftSourceId && activeConfig && !isOwner);
  const canEdit = !isReadOnly;

  const normalizedDraft = useMemo(
    () => (draft ? normalizeDraft(draft, instructorName) : null),
    [draft, instructorName]
  );

  const wordCount = useMemo(() => {
    if (!normalizedDraft) {
      return 0;
    }
    return normalizedDraft.wordBank.filter((entry) => entry.word.length > 0).length;
  }, [normalizedDraft]);

  const validationIssues = useMemo(() => {
    if (!normalizedDraft) {
      return [];
    }
    const issues: string[] = [];
    if (!normalizedDraft.name) {
      issues.push("Name is required.");
    }
    const emptyWords = normalizedDraft.wordBank.filter((entry) => !entry.word).length;
    if (wordCount < 12) {
      issues.push("Word bank needs at least 12 words.");
    }
    if (wordCount > 100) {
      issues.push("Word bank cannot exceed 100 words.");
    }
    if (emptyWords > 0) {
      issues.push("Remove or fill in empty word entries.");
    }
    const emptyQuestions = normalizedDraft.suggestedQuestions.filter(
      (question) => !question.text
    ).length;
    if (normalizedDraft.suggestedQuestions.length < 1) {
      issues.push("Add at least one suggested question.");
    }
    if (normalizedDraft.suggestedQuestions.length > 50) {
      issues.push("Suggested questions cannot exceed 50.");
    }
    if (emptyQuestions > 0) {
      issues.push("Remove or fill in empty questions.");
    }
    if (!normalizedDraft.author) {
      issues.push("Set your instructor name to save configs.");
    }
    if (normalizedDraft.settings.gridSize > wordCount && wordCount > 0) {
      issues.push(`Grid size (${normalizedDraft.settings.gridSize}) cannot exceed word count (${wordCount}).`);
    }
    if (normalizedDraft.settings.gridSize < 4) {
      issues.push("Grid size must be at least 4.");
    }
    if (normalizedDraft.settings.gridSize > 100) {
      issues.push("Grid size cannot exceed 100.");
    }
    return issues;
  }, [normalizedDraft, wordCount]);

  const previewCards = useMemo(() => {
    if (!normalizedDraft) {
      return [];
    }
    return normalizedDraft.wordBank
      .filter((entry) => entry.word.length > 0)
      .slice(0, normalizedDraft.settings.gridSize)
      .map((entry, index) => ({ word: entry.word, index }));
  }, [normalizedDraft]);

  useEffect(() => {
    localStorage.setItem("instructorName", instructorName);
  }, [instructorName]);

  const refreshConfigs = async () => {
    setListLoading(true);
    setListError(null);
    const response = await api.configs.list();
    if (response.success && response.data) {
      setConfigs(response.data);
    } else {
      setListError(response.error || response.errors?.join(", ") || "Failed to load configs.");
    }
    setListLoading(false);
  };

  useEffect(() => {
    refreshConfigs();
  }, []);

  const handleSelectConfig = (config: GameConfig) => {
    setSelectedConfigId(config.id);
    setDraftSourceId(config.id);
    setDraft(buildDraftFromConfig(config));
    setSaveError(null);
    setSaveMessage(null);
  };

  const handleCreateNew = () => {
    setSelectedConfigId(null);
    setDraftSourceId(null);
    setDraft(createEmptyDraft(instructorName));
    setSaveError(null);
    setSaveMessage(null);
  };

  const handleDuplicate = (config: GameConfig) => {
    setSelectedConfigId(null);
    setDraftSourceId(null);
    setDraft({
      ...buildDraftFromConfig(config),
      id: undefined,
      name: `${config.name} (Copy)`,
      author: instructorName.trim() || undefined,
    });
    setSaveError(null);
    setSaveMessage(null);
  };

  const updateDraft = (updates: Partial<GameConfigInput>) => {
    setDraft((current) => (current ? { ...current, ...updates } : current));
  };

  const updateSettings = (updates: Partial<GameConfigInput["settings"]>) => {
    setDraft((current) =>
      current ? { ...current, settings: { ...current.settings, ...updates } } : current
    );
  };

  const handleWordChange = (index: number, value: string) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }
      const wordBank = [...current.wordBank];
      wordBank[index] = { ...wordBank[index], word: value };
      return { ...current, wordBank };
    });
  };

  const handleRemoveWord = (index: number) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        wordBank: current.wordBank.filter((_, wordIndex) => wordIndex !== index),
      };
    });
  };

  const handleAddWords = () => {
    if (!draft) {
      return;
    }
    const lines = newWords
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const availableSlots = 100 - draft.wordBank.length;
    const wordsToAdd = lines.slice(0, availableSlots);

    if (wordsToAdd.length === 0) {
      return;
    }

    setDraft({
      ...draft,
      wordBank: [...draft.wordBank, ...wordsToAdd.map((word) => ({ word }))],
    });
    setNewWords("");
  };

  const handleQuestionTextChange = (index: number, value: string) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }
      const updated = [...current.suggestedQuestions];
      updated[index] = { ...updated[index], text: value };
      return { ...current, suggestedQuestions: updated };
    });
  };

  const handleQuestionCategoryChange = (index: number, value: QuestionCategory) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }
      const updated = [...current.suggestedQuestions];
      updated[index] = { ...updated[index], category: value };
      return { ...current, suggestedQuestions: updated };
    });
  };

  const handleRemoveQuestion = (index: number) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        suggestedQuestions: current.suggestedQuestions.filter(
          (_, questionIndex) => questionIndex !== index
        ),
      };
    });
  };

  const handleAddQuestion = () => {
    if (!draft) {
      return;
    }
    const trimmed = newQuestionText.trim();
    if (!trimmed || draft.suggestedQuestions.length >= 50) {
      return;
    }
    setDraft({
      ...draft,
      suggestedQuestions: [
        ...draft.suggestedQuestions,
        { text: trimmed, category: newQuestionCategory },
      ],
    });
    setNewQuestionText("");
  };

  const handleAddBulkQuestions = () => {
    if (!draft) {
      return;
    }
    const lines = bulkQuestions
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const availableSlots = 50 - draft.suggestedQuestions.length;
    const questionsToAdd = lines.slice(0, availableSlots).map((line) => {
      // Check for category prefix format: "category: question text"
      const prefixMatch = line.match(
        /^(letters|sounds|length|patterns|meaning):\s*(.+)$/i
      );
      if (prefixMatch) {
        return {
          text: prefixMatch[2],
          category: prefixMatch[1].toLowerCase() as QuestionCategory,
        };
      }
      return { text: line, category: bulkQuestionCategory };
    });

    if (questionsToAdd.length === 0) {
      return;
    }

    setDraft({
      ...draft,
      suggestedQuestions: [...draft.suggestedQuestions, ...questionsToAdd],
    });
    setBulkQuestions("");
  };

  const handleGenerateId = () => {
    if (!draft || draftSourceId) {
      return;
    }
    const trimmedName = draft.name.trim();
    if (!trimmedName) {
      return;
    }
    setDraft({
      ...draft,
      id: generateIdFromName(trimmedName),
    });
  };

  const handleSave = async () => {
    if (!draft || !normalizedDraft) {
      return;
    }
    setSaveError(null);
    setSaveMessage(null);
    if (!canEdit || validationIssues.length > 0) {
      setSaveError("Fix the issues above before saving.");
      return;
    }
    setIsSaving(true);
    const response = draftSourceId
      ? await api.configs.update(draftSourceId, normalizedDraft)
      : await api.configs.create(normalizedDraft);
    if (response.success && response.data) {
      await refreshConfigs();
      setSelectedConfigId(response.data.id);
      setDraftSourceId(response.data.id);
      setDraft(buildDraftFromConfig(response.data));
      setSaveMessage(draftSourceId ? "Config updated." : "Config created.");
    } else {
      setSaveError(
        response.error || response.errors?.join(", ") || "Failed to save config."
      );
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!draftSourceId || !canEdit || !isOwner) {
      return;
    }
    const confirmed = window.confirm(
      "Delete this configuration? This cannot be undone."
    );
    if (!confirmed) {
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    const response = await api.configs.delete(draftSourceId, instructorName);
    if (response.success) {
      setDraft(null);
      setDraftSourceId(null);
      setSelectedConfigId(null);
      setSaveMessage("Config deleted.");
      await refreshConfigs();
    } else {
      setSaveError(
        response.error || response.errors?.join(", ") || "Failed to delete config."
      );
    }
    setIsSaving(false);
  };

  const canSave = canEdit && validationIssues.length === 0 && !isSaving;
  const displayIssues = canEdit ? validationIssues : [];

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <header className="max-w-6xl mx-auto mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl text-pencil mb-2 text-shadow">
              Instructor Dashboard
            </h1>
            <p className="font-ui text-pencil/70">
              Build and manage sight word configurations.
            </p>
          </div>
          <Link
            to="/"
            className="btn-secondary w-full sm:w-auto text-center text-sm py-2 px-4"
          >
            Back to Home
          </Link>
        </div>

        <div className="paper-card p-4 mt-6">
          <label htmlFor="instructorName" className="block font-ui text-sm text-pencil/70 mb-1">
            Instructor Name
          </label>
          <input
            id="instructorName"
            type="text"
            value={instructorName}
            onChange={(event) => setInstructorName(event.target.value)}
            placeholder="Enter your name to unlock editing"
            className="input-field"
          />
          <p className="text-xs text-pencil/60 mt-2">
            Configs you create are locked to this name. Authentication will be added
            later.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_2fr] gap-8">
        <section className="paper-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl text-pencil">Configurations</h2>
            <button
              type="button"
              onClick={handleCreateNew}
              className="btn-secondary text-sm py-2 px-4"
            >
              New Config
            </button>
          </div>

          {listLoading && (
            <p className="text-sm text-pencil/60">Loading configurations...</p>
          )}

          {!listLoading && listError && (
            <div className="mb-4 p-3 bg-paper-red/10 text-paper-red rounded-lg text-sm">
              <p>{listError}</p>
              <button
                type="button"
                onClick={refreshConfigs}
                className="underline text-xs mt-2"
              >
                Retry
              </button>
            </div>
          )}

          {!listLoading && configs.length === 0 && !listError && (
            <p className="text-sm text-pencil/60">
              No configurations yet. Create one to get started.
            </p>
          )}

          <div className="space-y-3 mt-4">
            {configs.map((config) => {
              const owner =
                normalizeName(config.author) === normalizeName(instructorName) &&
                normalizeName(config.author) !== "";
              const isSelected = config.id === selectedConfigId;
              return (
                <div
                  key={config.id}
                  className={`rounded-lg border-2 p-3 transition ${
                    isSelected
                      ? "border-crayon-blue bg-crayon-blue/10"
                      : "border-kraft/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg text-pencil">{config.name}</h3>
                      <p className="text-xs text-pencil/60">
                        {config.wordBank.length} words | {config.suggestedQuestions.length}{" "}
                        questions
                      </p>
                      <p className="text-xs text-pencil/60">
                        Author: {config.author || "Unknown"}
                      </p>
                      <p className="text-xs text-pencil/50">
                        Updated {formatDate(config.updatedAt)}
                      </p>
                      {!owner && (
                        <span className="inline-block mt-2 px-2 py-1 text-xs bg-sunshine/30 text-pencil rounded">
                          View only
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectConfig(config)}
                        className="btn-primary text-xs py-2 px-3"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(config)}
                        className="btn-secondary text-xs py-2 px-3"
                      >
                        Duplicate
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-6">
          {!draft && (
            <div className="paper-card p-6 text-center text-pencil/60">
              {saveMessage && (
                <div className="mb-4 p-3 bg-grass/10 text-grass rounded-lg text-sm text-left">
                  {saveMessage}
                </div>
              )}
              <p className="font-ui text-sm">
                Select a configuration on the left or create a new one to begin.
              </p>
            </div>
          )}

          {draft && (
            <>
              <section className="paper-card p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-display text-2xl text-pencil">
                      {draftSourceId ? "Edit Configuration" : "Create Configuration"}
                    </h2>
                    <p className="text-sm text-pencil/60">
                      {draftSourceId
                        ? "Update the word bank, questions, and settings."
                        : "Start with the basics and build a new word set."}
                    </p>
                  </div>
                  {isReadOnly && (
                    <span className="text-xs bg-sunshine/40 text-pencil px-3 py-2 rounded">
                      View only - duplicate to edit
                    </span>
                  )}
                </div>

                {saveMessage && (
                  <div className="mt-4 p-3 bg-grass/10 text-grass rounded-lg text-sm">
                    {saveMessage}
                  </div>
                )}

                {saveError && (
                  <div className="mt-4 p-3 bg-paper-red/10 text-paper-red rounded-lg text-sm">
                    {saveError}
                  </div>
                )}

                {displayIssues.length > 0 && (
                  <div className="mt-4 p-3 bg-sunshine/20 text-pencil rounded-lg text-sm">
                    <p className="font-ui text-sm mb-2">Fix before saving:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {displayIssues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

              <section className="paper-card p-6">
                <h3 className="font-display text-xl text-pencil mb-4">Basics</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="configName" className="block font-ui text-sm text-pencil/70 mb-1">
                      Config Name
                    </label>
                    <input
                      id="configName"
                      type="text"
                      value={draft.name}
                      onChange={(event) => updateDraft({ name: event.target.value })}
                      className="input-field disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <label htmlFor="configId" className="block font-ui text-sm text-pencil/70 mb-1">
                      Config ID
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="configId"
                        type="text"
                        value={draft.id ?? ""}
                        onChange={(event) => updateDraft({ id: event.target.value })}
                        className="input-field disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={isReadOnly || Boolean(draftSourceId)}
                        placeholder="Auto-generated if left blank"
                      />
                      {!draftSourceId && (
                        <button
                          type="button"
                          onClick={handleGenerateId}
                          className="btn-secondary text-xs py-2 px-3"
                          disabled={isReadOnly}
                        >
                          Use Name
                        </button>
                      )}
                    </div>
                    {draftSourceId && (
                      <p className="text-xs text-pencil/60 mt-1">
                        IDs are locked for existing configs. Duplicate to change.
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  <label
                    htmlFor="configDescription"
                    className="block font-ui text-sm text-pencil/70 mb-1"
                  >
                    Description
                  </label>
                  <textarea
                    id="configDescription"
                    value={draft.description ?? ""}
                    onChange={(event) => updateDraft({ description: event.target.value })}
                    className="input-field min-h-[100px] disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={isReadOnly}
                    placeholder="Describe the word set (optional)"
                  />
                </div>
                <div className="mt-4">
                  <label
                    htmlFor="configAuthor"
                    className="block font-ui text-sm text-pencil/70 mb-1"
                  >
                    Author
                  </label>
                  <input
                    id="configAuthor"
                    type="text"
                    value={draft.author ?? instructorName}
                    className="input-field disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled
                    placeholder="Set instructor name above"
                  />
                </div>
              </section>

              <section className="paper-card p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <h3 className="font-display text-xl text-pencil">Word Bank</h3>
                  <span className="text-sm text-pencil/60">
                    {wordCount}/100 words
                  </span>
                </div>
                <p className="text-sm text-pencil/60 mb-4">
                  Add between 12 and 100 sight words. Metadata fields can be added later.
                </p>

                <div className="grid sm:grid-cols-2 gap-3">
                  {draft.wordBank.map((entry, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={entry.word}
                        onChange={(event) => handleWordChange(index, event.target.value)}
                        className="input-field disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={isReadOnly}
                        placeholder={`Word ${index + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveWord(index)}
                        className="btn-danger text-xs py-2 px-3"
                        disabled={isReadOnly}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-2 mt-4">
                  <textarea
                    value={newWords}
                    onChange={(event) => setNewWords(event.target.value)}
                    className="input-field min-h-[100px] disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={isReadOnly || draft.wordBank.length >= 100}
                    placeholder={"Enter words (one per line)\ncat\ndog\nfish"}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-pencil/60">
                      One word per line. {100 - draft.wordBank.length} slots remaining.
                    </p>
                    <button
                      type="button"
                      onClick={handleAddWords}
                      className="btn-secondary text-sm py-2 px-4"
                      disabled={isReadOnly || draft.wordBank.length >= 100}
                    >
                      Add Words
                    </button>
                  </div>
                </div>
              </section>

              <section className="paper-card p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <h3 className="font-display text-xl text-pencil">Suggested Questions</h3>
                  <span className="text-sm text-pencil/60">
                    {draft.suggestedQuestions.length}/50 questions
                  </span>
                </div>
                <p className="text-sm text-pencil/60 mb-4">
                  Add questions for players to ask. Categories help organize question
                  types.
                </p>

                <div className="space-y-3">
                  {draft.suggestedQuestions.map((question, index) => (
                    <div
                      key={index}
                      className="grid sm:grid-cols-[2fr_1fr_auto] gap-2"
                    >
                      <input
                        type="text"
                        value={question.text}
                        onChange={(event) =>
                          handleQuestionTextChange(index, event.target.value)
                        }
                        className="input-field disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={isReadOnly}
                        placeholder={`Question ${index + 1}`}
                      />
                      <select
                        value={question.category}
                        onChange={(event) =>
                          handleQuestionCategoryChange(
                            index,
                            event.target.value as QuestionCategory
                          )
                        }
                        className="input-field disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={isReadOnly}
                      >
                        {questionCategories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(index)}
                        className="btn-danger text-xs py-2 px-3"
                        disabled={isReadOnly}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div className="grid sm:grid-cols-[2fr_1fr_auto] gap-2 mt-4">
                  <input
                    type="text"
                    value={newQuestionText}
                    onChange={(event) => setNewQuestionText(event.target.value)}
                    className="input-field disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={isReadOnly || draft.suggestedQuestions.length >= 50}
                    placeholder="New question text"
                  />
                  <select
                    value={newQuestionCategory}
                    onChange={(event) =>
                      setNewQuestionCategory(event.target.value as QuestionCategory)
                    }
                    className="input-field disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={isReadOnly || draft.suggestedQuestions.length >= 50}
                  >
                    {questionCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="btn-secondary text-sm py-2 px-4"
                    disabled={isReadOnly || draft.suggestedQuestions.length >= 50}
                  >
                    Add Question
                  </button>
                </div>

                <div className="border-t border-kraft/30 pt-4 mt-4">
                  <p className="text-sm text-pencil/70 mb-2">Bulk Add Questions</p>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 mb-2">
                      <label className="text-xs text-pencil/60">Default category:</label>
                      <select
                        value={bulkQuestionCategory}
                        onChange={(event) =>
                          setBulkQuestionCategory(event.target.value as QuestionCategory)
                        }
                        className="input-field text-sm py-1"
                        disabled={isReadOnly || draft.suggestedQuestions.length >= 50}
                      >
                        {questionCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      value={bulkQuestions}
                      onChange={(event) => setBulkQuestions(event.target.value)}
                      className="input-field min-h-[100px] disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={isReadOnly || draft.suggestedQuestions.length >= 50}
                      placeholder={"Enter questions (one per line)\nDoes your word have the letter A?\nsounds: Does your word rhyme with cat?"}
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-pencil/60">
                        Optional: prefix with "category: " to override default.{" "}
                        {50 - draft.suggestedQuestions.length} slots remaining.
                      </p>
                      <button
                        type="button"
                        onClick={handleAddBulkQuestions}
                        className="btn-secondary text-sm py-2 px-4"
                        disabled={isReadOnly || draft.suggestedQuestions.length >= 50}
                      >
                        Add Questions
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="paper-card p-6">
                <h3 className="font-display text-xl text-pencil mb-4">Settings</h3>
                <div className="max-w-xs">
                  <div>
                    <label
                      htmlFor="gridSize"
                      className="block font-ui text-sm text-pencil/70 mb-1"
                    >
                      Grid Size (4-100)
                    </label>
                    <input
                      id="gridSize"
                      type="number"
                      min={4}
                      max={100}
                      value={draft.settings.gridSize}
                      onChange={(event) => {
                        const value = Math.max(4, Math.min(100, Number(event.target.value)));
                        updateSettings({
                          gridSize: Number.isNaN(value) ? 24 : value,
                        });
                      }}
                      className="input-field disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={isReadOnly}
                    />
                    <p className="text-xs text-pencil/60 mt-1">
                      Number of cards shown in the game (must have enough words in bank)
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.settings.allowCustomQuestions}
                      onChange={(event) =>
                        updateSettings({ allowCustomQuestions: event.target.checked })
                      }
                      className="w-5 h-5 rounded border-pencil/30 text-crayon-blue focus:ring-crayon-blue"
                      disabled={isReadOnly}
                    />
                    <span className="font-ui text-sm text-pencil">Allow custom questions</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.settings.showPhoneticHints}
                      onChange={(event) =>
                        updateSettings({ showPhoneticHints: event.target.checked })
                      }
                      className="w-5 h-5 rounded border-pencil/30 text-crayon-blue focus:ring-crayon-blue"
                      disabled={isReadOnly}
                    />
                    <span className="font-ui text-sm text-pencil">Show phonetic hints</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.settings.enableSounds}
                      onChange={(event) =>
                        updateSettings({ enableSounds: event.target.checked })
                      }
                      className="w-5 h-5 rounded border-pencil/30 text-crayon-blue focus:ring-crayon-blue"
                      disabled={isReadOnly}
                    />
                    <span className="font-ui text-sm text-pencil">Enable sound effects</span>
                  </label>
                </div>
              </section>

              <section className="paper-card p-6">
                <h3 className="font-display text-xl text-pencil mb-4">Preview</h3>
                {previewCards.length === 0 ? (
                  <p className="text-sm text-pencil/60">
                    Add words to preview the grid.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-pencil/60 mb-4">
                      Showing {previewCards.length} of {draft.settings.gridSize} cards.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {previewCards.map((card) => (
                        <WordCard
                          key={card.index}
                          card={card}
                          isFlipped={false}
                          isSecret={false}
                          isOpponentFlipped={false}
                          onClick={() => {}}
                          disabled
                        />
                      ))}
                    </div>
                  </>
                )}
              </section>

              <section className="paper-card p-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    className="btn-primary text-sm py-3 px-6"
                    disabled={!canSave}
                  >
                    {isSaving
                      ? "Saving..."
                      : draftSourceId
                      ? "Save Changes"
                      : "Create Config"}
                  </button>
                  {draftSourceId && isOwner && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="btn-danger text-sm py-3 px-6"
                      disabled={isSaving}
                    >
                      Delete Config
                    </button>
                  )}
                  {isReadOnly && activeConfig && (
                    <button
                      type="button"
                      onClick={() => handleDuplicate(activeConfig)}
                      className="btn-secondary text-sm py-3 px-6"
                    >
                      Duplicate to Edit
                    </button>
                  )}
                </div>
                {draftSourceId && (
                  <p className="text-xs text-pencil/60">
                    Last updated {formatDate(activeConfig?.updatedAt ?? "")}
                  </p>
                )}
              </section>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
