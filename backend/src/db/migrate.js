require('dotenv').config();
const pool = require('./pool');

const schema = `
  CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    due_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    assignee_name TEXT NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    author TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS root_problems (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    thesis TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS root_problem_id INTEGER
      REFERENCES root_problems(id) ON DELETE SET NULL;

  ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS phase TEXT NOT NULL DEFAULT 'discovery'
      CHECK (phase IN ('discovery', 'solution'));

  CREATE TABLE IF NOT EXISTS task_links (
    id SERIAL PRIMARY KEY,
    task_id_a INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    task_id_b INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT task_links_no_self CHECK (task_id_a <> task_id_b),
    CONSTRAINT task_links_ordered CHECK (task_id_a < task_id_b)
  );

  CREATE UNIQUE INDEX IF NOT EXISTS task_links_unique ON task_links (task_id_a, task_id_b);

  CREATE TABLE IF NOT EXISTS tags (
    id   SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS task_tags (
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
  );

  CREATE TABLE IF NOT EXISTS project_tags (
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tag_id     INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, tag_id)
  );

  CREATE TABLE IF NOT EXISTS insights (
    id         SERIAL PRIMARY KEY,
    title      TEXT NOT NULL,
    body       TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS insight_tags (
    insight_id INTEGER NOT NULL REFERENCES insights(id) ON DELETE CASCADE,
    tag_id     INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (insight_id, tag_id)
  );

  CREATE TABLE IF NOT EXISTS stakeholder_views (
    id          SERIAL PRIMARY KEY,
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    audience    TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS calendar_events (
    id             SERIAL PRIMARY KEY,
    title          TEXT NOT NULL,
    description    TEXT,
    start_time     TIMESTAMP NOT NULL,
    end_time       TIMESTAMP NOT NULL,
    all_day        BOOLEAN NOT NULL DEFAULT FALSE,
    task_id        INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    caldav_uid     TEXT UNIQUE,
    recurrence     TEXT CHECK (recurrence IN ('none','weekly','fortnightly','monthly')) NOT NULL DEFAULT 'none',
    recurrence_end DATE,
    created_at     TIMESTAMPTZ DEFAULT NOW()
  );

  -- Migrate existing TIMESTAMPTZ columns to TIMESTAMP if they exist
  ALTER TABLE calendar_events
    ALTER COLUMN start_time TYPE TIMESTAMP USING start_time AT TIME ZONE 'UTC',
    ALTER COLUMN end_time   TYPE TIMESTAMP USING end_time   AT TIME ZONE 'UTC';
`;

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(schema);
    console.log('Migration complete');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
