-- ============================================================
-- Word Guess Who: Initial Schema
-- ============================================================

-- INSTRUCTORS: extends auth.users (Supabase email/password auth)
CREATE TABLE instructors (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- STUDENTS: anonymous auth, no email required
CREATE TABLE students (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username   TEXT NOT NULL,
  class_id   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (class_id, username)
);

-- Case-insensitive username uniqueness per class
CREATE UNIQUE INDEX students_class_username_lower_idx
  ON students (class_id, LOWER(username));

-- GAME CONFIGS
CREATE TABLE game_configs (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL,
  config_json   JSONB NOT NULL,
  is_public     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- GAME SESSIONS (replaces in-memory SessionManager)
CREATE TYPE game_phase AS ENUM ('waiting', 'selecting', 'playing', 'finished');

CREATE TABLE game_sessions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                    TEXT NOT NULL UNIQUE,
  config_id               TEXT REFERENCES game_configs(id) ON DELETE SET NULL,
  phase                   game_phase NOT NULL DEFAULT 'waiting',
  player0_uid             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  player0_name            TEXT,
  player0_connected       BOOLEAN NOT NULL DEFAULT FALSE,
  player0_ready           BOOLEAN NOT NULL DEFAULT FALSE,
  player1_uid             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  player1_name            TEXT,
  player1_connected       BOOLEAN NOT NULL DEFAULT FALSE,
  player1_ready           BOOLEAN NOT NULL DEFAULT FALSE,
  -- Board state (JSON arrays populated when game moves to selecting/playing)
  cards_json              JSONB,                   -- [{word, index}, ...] same for both players
  player0_flipped_cards   JSONB NOT NULL DEFAULT '[]', -- [cardIndex, ...] cards eliminated by player 0
  player1_flipped_cards   JSONB NOT NULL DEFAULT '[]', -- [cardIndex, ...] cards eliminated by player 1
  current_turn            INTEGER CHECK (current_turn IN (0, 1)),
  pending_question        TEXT,
  awaiting_answer         BOOLEAN NOT NULL DEFAULT FALSE,
  winner                  INTEGER CHECK (winner IN (0, 1)),
  is_local_mode           BOOLEAN NOT NULL DEFAULT FALSE,
  show_only_last_question BOOLEAN NOT NULL DEFAULT FALSE,
  random_secret_words     BOOLEAN NOT NULL DEFAULT FALSE,
  shared_computer_mode    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at              TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '20 minutes'
);

-- GAME SECRETS: isolated table to prevent Realtime exposure of opponent's secret
CREATE TABLE game_secrets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_index    INTEGER NOT NULL CHECK (player_index IN (0, 1)),
  player_uid      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  secret_word       TEXT NOT NULL,
  secret_word_index INTEGER,  -- card index on the board (set when word is selected)
  UNIQUE (game_session_id, player_index)
);

-- QUESTION LOG (replaces in-memory questionLog array)
CREATE TABLE game_questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  question_index  INTEGER NOT NULL,
  asker_index     INTEGER NOT NULL CHECK (asker_index IN (0, 1)),
  question_text   TEXT NOT NULL,
  answer          BOOLEAN,
  is_guess        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  answered_at     TIMESTAMPTZ
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_questions ENABLE ROW LEVEL SECURITY;

-- INSTRUCTORS policies
CREATE POLICY "instructors: own profile"
  ON instructors FOR ALL
  USING (id = auth.uid());

-- STUDENTS policies
CREATE POLICY "students: own profile"
  ON students FOR ALL
  USING (id = auth.uid());

-- GAME CONFIGS policies
CREATE POLICY "configs: public templates readable by all"
  ON game_configs FOR SELECT
  USING (is_public = TRUE OR instructor_id = auth.uid());

CREATE POLICY "configs: instructors manage own"
  ON game_configs FOR ALL
  USING (instructor_id = auth.uid());

-- GAME SESSIONS policies
-- Players can see their game; anyone can see waiting games (to join)
CREATE POLICY "sessions: players or waiting"
  ON game_sessions FOR SELECT
  USING (
    player0_uid = auth.uid()
    OR player1_uid = auth.uid()
    OR phase = 'waiting'
  );

CREATE POLICY "sessions: players can update"
  ON game_sessions FOR UPDATE
  USING (player0_uid = auth.uid() OR player1_uid = auth.uid());

CREATE POLICY "sessions: authenticated can create"
  ON game_sessions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- GAME SECRETS policies: player sees only their own secret
CREATE POLICY "secrets: own secret only"
  ON game_secrets FOR SELECT
  USING (player_uid = auth.uid());

CREATE POLICY "secrets: insert own secret"
  ON game_secrets FOR INSERT
  WITH CHECK (player_uid = auth.uid());

-- GAME QUESTIONS policies: players in the game can read questions
CREATE POLICY "questions: game players can read"
  ON game_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_sessions gs
      WHERE gs.id = game_session_id
        AND (gs.player0_uid = auth.uid() OR gs.player1_uid = auth.uid())
    )
  );

CREATE POLICY "questions: game players can insert"
  ON game_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_sessions gs
      WHERE gs.id = game_session_id
        AND (gs.player0_uid = auth.uid() OR gs.player1_uid = auth.uid())
    )
  );

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER game_sessions_updated_at
  BEFORE UPDATE ON game_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER game_configs_updated_at
  BEFORE UPDATE ON game_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- REALTIME: enable for game_sessions (Postgres Changes)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE game_questions;
