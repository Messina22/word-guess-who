import { Link } from "react-router-dom";
import { CreateGameForm } from "@client/components/lobby/CreateGameForm";
import { JoinGameForm } from "@client/components/lobby/JoinGameForm";

export function HomePage() {
  return (
    <div className="min-h-screen p-4 sm:p-8">
      <header className="text-center mb-8 sm:mb-12">
        <h1 className="font-display text-4xl sm:text-5xl text-pencil mb-2 text-shadow">
          Sight Word Guess Who
        </h1>
        <p className="font-ui text-pencil/70">
          A two-player game for practicing sight words
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
        <p>Made for learning sight words</p>
        <p className="mt-1">
          Created by{" "}
          <a
            href="https://github.com/Messina22"
            target="_blank"
            rel="noopener noreferrer"
            className="text-crayon-blue hover:underline"
          >
            Messina22
          </a>
        </p>
      </footer>
    </div>
  );
}
