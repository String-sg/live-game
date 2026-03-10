-- Pearl Exchange: Database Schema
-- Run this once in your Neon SQL editor to initialise the database

-- Sessions: one per game hosted by a teacher
CREATE TABLE IF NOT EXISTS sessions (
  id          VARCHAR(6)   PRIMARY KEY,
  passphrase  TEXT         NOT NULL,
  status      VARCHAR(20)  NOT NULL DEFAULT 'lobby'
                           CHECK (status IN ('lobby', 'active', 'ended')),
  round_duration INTEGER   NOT NULL DEFAULT 300,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Players: students who joined the session
CREATE TABLE IF NOT EXISTS players (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   VARCHAR(6)   NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name         TEXT         NOT NULL,
  total_surplus DECIMAL(10,2) NOT NULL DEFAULT 0,
  joined_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Rounds: each trading period within a session
CREATE TABLE IF NOT EXISTS rounds (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       VARCHAR(6)  NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  round_number     INTEGER     NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active', 'ended')),
  shock_description TEXT,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at         TIMESTAMPTZ,
  UNIQUE(session_id, round_number)
);

-- Player Rounds: role assignment per player per round
CREATE TABLE IF NOT EXISTS player_rounds (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id    UUID        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  round_id     UUID        NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  role         VARCHAR(10) NOT NULL CHECK (role IN ('buyer', 'seller')),
  secret_value DECIMAL(10,2) NOT NULL,
  has_traded   BOOLEAN     NOT NULL DEFAULT FALSE,
  surplus_earned DECIMAL(10,2) NOT NULL DEFAULT 0,
  UNIQUE(player_id, round_id)
);

-- Transactions: trade proposals between two students
CREATE TABLE IF NOT EXISTS transactions (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id         UUID         NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  session_id       VARCHAR(6)   NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  initiator_id     UUID         NOT NULL REFERENCES players(id),
  partner_id       UUID         NOT NULL REFERENCES players(id),
  price            DECIMAL(10,2) NOT NULL,
  status           VARCHAR(20)  NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'confirmed', 'rejected')),
  consumer_surplus DECIMAL(10,2),
  producer_surplus DECIMAL(10,2),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  confirmed_at     TIMESTAMPTZ
);

-- Market Shocks: teacher-triggered events that affect the next round
CREATE TABLE IF NOT EXISTS shocks (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       VARCHAR(6)  NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  type             VARCHAR(20) NOT NULL CHECK (type IN ('supply', 'demand')),
  description      TEXT        NOT NULL,
  price_shift      DECIMAL(10,2) NOT NULL DEFAULT 10,
  applied_to_round INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
