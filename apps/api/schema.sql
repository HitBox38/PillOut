-- Pillout API schema (libSQL / Turso)

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    nickname TEXT,
    avatar_filename TEXT,
    avatar_id INTEGER REFERENCES avatars (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS drugs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    asset_filename TEXT NOT NULL,
    catalog_key TEXT
);


CREATE TABLE IF NOT EXISTS user_drugs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    drug_id INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (drug_id) REFERENCES drugs (id) ON DELETE CASCADE,
    UNIQUE (user_id, drug_id)
);

CREATE INDEX IF NOT EXISTS idx_user_drugs_user_id ON user_drugs (user_id);
CREATE INDEX IF NOT EXISTS idx_user_drugs_drug_id ON user_drugs (drug_id);

CREATE TABLE IF NOT EXISTS avatars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    filename TEXT NOT NULL,
    catalog_key TEXT
);

CREATE TABLE IF NOT EXISTS user_avatars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    avatar_id INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (avatar_id) REFERENCES avatars (id) ON DELETE CASCADE,
    UNIQUE (user_id, avatar_id)
);

CREATE INDEX IF NOT EXISTS idx_user_avatars_user_id ON user_avatars (user_id);
CREATE INDEX IF NOT EXISTS idx_user_avatars_avatar_id ON user_avatars (avatar_id);
