-- FlexiSchool — Initial Migration
-- PostgreSQL 15 with Row-Level Security

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── ENUMS ───────────────────────────────────────────────────────────────────

CREATE TYPE level_enum          AS ENUM ('PRIMARY','SECONDARY','K_12');
CREATE TYPE boarding_type_enum  AS ENUM ('DAY_ONLY','BOARDING_ONLY','HYBRID');
CREATE TYPE sub_status_enum     AS ENUM ('ACTIVE','PAST_DUE','SUSPENDED');
CREATE TYPE sub_tier_enum       AS ENUM ('STARTER','PROFESSIONAL','ENTERPRISE');
CREATE TYPE boarding_status_enum AS ENUM ('DAY','BOARDER');
CREATE TYPE term_enum           AS ENUM ('FIRST','SECOND','THIRD');
CREATE TYPE gender_enum         AS ENUM ('MALE','FEMALE','MIXED');
CREATE TYPE bed_status_enum     AS ENUM ('VACANT','OCCUPIED','MAINTENANCE');

-- ─── TENANTS ─────────────────────────────────────────────────────────────────

CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  subdomain     TEXT UNIQUE NOT NULL,
  level         level_enum NOT NULL,
  boarding_type boarding_type_enum NOT NULL,
  sub_status    sub_status_enum NOT NULL DEFAULT 'ACTIVE',
  sub_tier      sub_tier_enum   NOT NULL DEFAULT 'STARTER',
  feature_flags JSONB NOT NULL DEFAULT '{}',
  branding      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── FEATURE FLAG DERIVED VIEW ───────────────────────────────────────────────

CREATE VIEW tenant_active_flags AS
SELECT
  id                                                               AS tenant_id,
  (boarding_type IN ('BOARDING_ONLY','HYBRID'))                   AS flag_hostel,
  COALESCE((feature_flags->>'sports')::BOOLEAN, TRUE)            AS flag_sports,
  (sub_tier IN ('PROFESSIONAL','ENTERPRISE'))                     AS flag_finance,
  (sub_status = 'ACTIVE')                                        AS flag_write_access,
  (level IN ('SECONDARY','K_12'))                                AS flag_alumni
FROM tenants;

-- ─── RBAC ────────────────────────────────────────────────────────────────────

CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]',
  UNIQUE (tenant_id, name)
);

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role_id       UUID NOT NULL REFERENCES roles(id),
  profile       JSONB NOT NULL DEFAULT '{}',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_tenant_iso ON users
  USING (tenant_id = current_setting('app.tenant_id', TRUE)::UUID);

-- ─── ACADEMIC CORE ───────────────────────────────────────────────────────────

CREATE TABLE academic_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  start_date DATE,
  end_date   DATE,
  is_current BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE academic_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY sessions_tenant_iso ON academic_sessions
  USING (tenant_id = current_setting('app.tenant_id', TRUE)::UUID);

CREATE TABLE grading_scales (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  bands     JSONB NOT NULL
);

ALTER TABLE grading_scales ENABLE ROW LEVEL SECURITY;
CREATE POLICY grading_scales_tenant_iso ON grading_scales
  USING (tenant_id = current_setting('app.tenant_id', TRUE)::UUID);

CREATE TABLE subjects (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  code             TEXT,
  department       TEXT,
  grading_scale_id UUID REFERENCES grading_scales(id)
);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY subjects_tenant_iso ON subjects
  USING (tenant_id = current_setting('app.tenant_id', TRUE)::UUID);

CREATE TABLE classes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  level      TEXT,
  arm        TEXT,
  session_id UUID NOT NULL REFERENCES academic_sessions(id)
);

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY classes_tenant_iso ON classes
  USING (tenant_id = current_setting('app.tenant_id', TRUE)::UUID);

CREATE TABLE students (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id         UUID UNIQUE REFERENCES users(id),
  admission_no    TEXT NOT NULL,
  class_id        UUID REFERENCES classes(id),
  boarding_status boarding_status_enum NOT NULL DEFAULT 'DAY',
  sports_house_id UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, admission_no)
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY students_tenant_iso ON students
  USING (tenant_id = current_setting('app.tenant_id', TRUE)::UUID);

CREATE TABLE ca_weights (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id),
  components JSONB NOT NULL
);

ALTER TABLE ca_weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY ca_weights_tenant_iso ON ca_weights
  USING (tenant_id = current_setting('app.tenant_id', TRUE)::UUID);

CREATE TABLE scores (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id   UUID NOT NULL REFERENCES students(id),
  subject_id   UUID NOT NULL REFERENCES subjects(id),
  session_id   UUID NOT NULL REFERENCES academic_sessions(id),
  term         term_enum NOT NULL,
  components   JSONB NOT NULL,
  total        NUMERIC(5,2) NOT NULL,
  submitted_by UUID REFERENCES users(id),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, student_id, subject_id, session_id, term)
);

ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY scores_tenant_iso ON scores
  USING (tenant_id = current_setting('app.tenant_id', TRUE)::UUID);

-- ─── HOSTEL / BOARDING ───────────────────────────────────────────────────────

CREATE TABLE dormitories (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  gender    gender_enum NOT NULL,
  capacity  INT NOT NULL
);

ALTER TABLE dormitories ENABLE ROW LEVEL SECURITY;
CREATE POLICY dormitories_tenant_iso ON dormitories
  USING (tenant_id = current_setting('app.tenant_id', TRUE)::UUID);

CREATE TABLE beds (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  dormitory_id UUID NOT NULL REFERENCES dormitories(id),
  room_number  TEXT NOT NULL,
  bed_number   TEXT NOT NULL,
  status       bed_status_enum NOT NULL DEFAULT 'VACANT',
  UNIQUE (tenant_id, dormitory_id, room_number, bed_number)
);

ALTER TABLE beds ENABLE ROW LEVEL SECURITY;
CREATE POLICY beds_tenant_iso ON beds
  USING (tenant_id = current_setting('app.tenant_id', TRUE)::UUID);

CREATE TABLE hostel_allocations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bed_id       UUID NOT NULL REFERENCES beds(id),
  student_id   UUID NOT NULL REFERENCES students(id),
  session_id   UUID NOT NULL REFERENCES academic_sessions(id),
  allocated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, student_id, session_id)
);

ALTER TABLE hostel_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY hostel_allocations_tenant_iso ON hostel_allocations
  USING (tenant_id = current_setting('app.tenant_id', TRUE)::UUID);

-- ─── SPORTS ──────────────────────────────────────────────────────────────────

CREATE TABLE sports_houses (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  colour     TEXT,
  captain_id UUID REFERENCES students(id)
);

ALTER TABLE sports_houses ENABLE ROW LEVEL SECURITY;
CREATE POLICY sports_houses_tenant_iso ON sports_houses
  USING (tenant_id = current_setting('app.tenant_id', TRUE)::UUID);

CREATE TABLE sports_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  event_date DATE,
  category   TEXT,
  results    JSONB NOT NULL DEFAULT '[]'
);

ALTER TABLE sports_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY sports_events_tenant_iso ON sports_events
  USING (tenant_id = current_setting('app.tenant_id', TRUE)::UUID);

-- ─── INDEXES ─────────────────────────────────────────────────────────────────

CREATE INDEX idx_students_tenant     ON students(tenant_id);
CREATE INDEX idx_students_class      ON students(class_id);
CREATE INDEX idx_scores_tenant_term  ON scores(tenant_id, session_id, term);
CREATE INDEX idx_scores_student      ON scores(student_id);
CREATE INDEX idx_beds_status         ON beds(tenant_id, status);
CREATE INDEX idx_hostel_session      ON hostel_allocations(tenant_id, session_id);
