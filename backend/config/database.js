import pg from "pg";

/*
  SUPABASE / POSTGRES CONNECTION GUIDE
  ------------------------------------
  1. Create a new Supabase project (or open your existing one).
  2. Go to: Project Settings -> Database -> Connection string -> URI.
  3. Copy the URI and replace [YOUR-PASSWORD] with your actual database password.
  4. Put it in your environment variables as DATABASE_URL.
     - Local development: add DATABASE_URL to .env (this file is gitignored).
     - Render deployment: add DATABASE_URL in Render Dashboard -> Service -> Environment.
  5. Restart the server after changing environment variables.

  Connection notes:
  - Direct connection usually uses port 5432.
  - Supabase may also offer pooler connection strings; use the one recommended for
    long-running Node/Express servers if you prefer pooling.
  - Hosted Supabase/Postgres typically requires SSL. The Pool config below enables SSL
    when DATABASE_URL is present.
*/

const { Pool } = pg;

export const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

export const pool = isDatabaseConfigured
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      // Supabase/hosted Postgres commonly requires SSL. In production on Render this
      // should be enabled. If you use a local Postgres instance without SSL, adjust this.
      ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
    })
  : null;

/*
  DATABASE SEQUENCE (ENROLLMENTS)
  -------------------------------
  This initializes the table used by:
  - POST /api/enrollments        -> inserts a new enrollment request
  - GET  /api/enrollments        -> admin dashboard lists all requests
  - PATCH /api/enrollments/:ref/check -> admin marks request as checked/pending

  You can also run this SQL manually in Supabase -> SQL Editor.
*/
const CREATE_ENROLLMENTS_TABLE_SQL = `
  create table if not exists enrollments (
    reference_code text primary key,
    date_received timestamptz not null default now(),
    checked boolean not null default false,
    first_name text not null,
    middle_name text,
    last_name text not null,
    email text not null,
    mobile text not null,
    education_level text not null,
    grade_level text,
    strand text,
    program text,
    student_type text not null,
    visit_date date not null,
    time_slot text not null,
    notes text
  );

  create index if not exists enrollments_date_received_idx
    on enrollments (date_received desc);
`;

export async function initDatabase() {
  if (!pool) {
    throw new Error(
      "DATABASE_URL is not configured. Add your Supabase Postgres connection string to .env (local) or Render environment variables."
    );
  }

  // Simple connectivity check + schema initialization.
  await pool.query("select 1");
  await pool.query(CREATE_ENROLLMENTS_TABLE_SQL);
}

export async function closeDatabase() {
  if (pool) {
    await pool.end();
  }
}

export default pool;
