import { Link } from "react-router-dom";
import { CreateGameForm } from "@client/components/lobby/CreateGameForm";
import { JoinGameForm } from "@client/components/lobby/JoinGameForm";

export function HomePage() {
  return (
    <div className="min-h-screen p-4 sm:p-8">
      <header className="text-center mb-8 sm:mb-12">
        <h1 className="font-display text-4xl sm:text-5xl text-pencil mb-2 text-shadow">
          Word Guess Who
        </h1>
        <p className="font-ui text-pencil/70">
          A two-player game for practicing sight & spelling words
        </p>
        <div className="mt-4">
          <Link
            to="/instructor"
            className="btn-secondary inline-block text-sm py-2 px-4"
          >
            Create your own word bank
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto">
        <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
          <CreateGameForm />
          <JoinGameForm />
        </div>

        <section className="mt-12 paper-card p-6">
          <h2 className="font-display text-2xl text-pencil mb-4 text-center">
            How to Play
          </h2>
          <div className="grid sm:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-4xl mb-2">🎯</div>
              <h3 className="font-display text-lg text-pencil mb-1">
                Guess the Word
              </h3>
              <p className="text-sm text-pencil/70">
                Each player has a secret word. Be the first to guess your
                opponent's word!
              </p>
            </div>
            <div>
              <div className="text-4xl mb-2">❓</div>
              <h3 className="font-display text-lg text-pencil mb-1">
                Ask Questions
              </h3>
              <p className="text-sm text-pencil/70">
                Take turns asking yes/no questions about letters, sounds, and
                patterns.
              </p>
            </div>
            <div>
              <div className="text-4xl mb-2">🔄</div>
              <h3 className="font-display text-lg text-pencil mb-1">
                Flip Cards
              </h3>
              <p className="text-sm text-pencil/70">
                Eliminate words that don't match the answers to narrow down your
                guess.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="text-center mt-12 text-pencil/50 text-sm">
        <p>Made for learning sight & spelling words</p>
        <p className="mt-1">
          Created by{" "}
          <a
            href="https://github.com/Messina22"
            target="_blank"
            rel="noopener noreferrer"
            className="text-crayon-blue hover:underline inline-flex items-center gap-1"
          >
            Messina22
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
        </p>
      </footer>
    </div>
  );
}
