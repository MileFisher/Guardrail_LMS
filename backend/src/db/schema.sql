CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consent_policies (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  content_markdown TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  accepted BOOLEAN NOT NULL DEFAULT TRUE,
  policy_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, student_id)
);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assignment_type TEXT NOT NULL DEFAULT 'essay' CHECK (assignment_type IN ('essay', 'qa', 'mcq')),
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  mcq_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_hint_level INTEGER NOT NULL DEFAULT 3 CHECK (max_hint_level BETWEEN 1 AND 3),
  min_words_for_hint INTEGER NOT NULL DEFAULT 50 CHECK (min_words_for_hint >= 0),
  zscore_threshold NUMERIC(6, 2),
  paste_threshold_chars INTEGER,
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_lectures (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  media_type TEXT NOT NULL DEFAULT 'link' CHECK (media_type IN ('link', 'image', 'video')),
  media_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS assignment_type TEXT;

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS mcq_questions JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE assignments
SET assignment_type = 'essay'
WHERE assignment_type IS NULL;

UPDATE assignments
SET mcq_questions = '[]'::jsonb
WHERE mcq_questions IS NULL;

ALTER TABLE assignments
  ALTER COLUMN assignment_type SET DEFAULT 'essay';

ALTER TABLE assignments
  ALTER COLUMN assignment_type SET NOT NULL;

ALTER TABLE assignments
  ALTER COLUMN mcq_questions SET DEFAULT '[]'::jsonb;

ALTER TABLE assignments
  ALTER COLUMN mcq_questions SET NOT NULL;

ALTER TABLE assignments
  DROP CONSTRAINT IF EXISTS assignments_assignment_type_check;

ALTER TABLE assignments
  ADD CONSTRAINT assignments_assignment_type_check
  CHECK (assignment_type IN ('essay', 'qa', 'mcq'));

ALTER TABLE course_lectures
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

ALTER TABLE course_lectures
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'link';

ALTER TABLE course_lectures
  ADD COLUMN IF NOT EXISTS media_url TEXT;

ALTER TABLE course_lectures
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE course_lectures
  DROP CONSTRAINT IF EXISTS course_lectures_media_type_check;

ALTER TABLE course_lectures
  ADD CONSTRAINT course_lectures_media_type_check
  CHECK (media_type IN ('link', 'image', 'video'));

CREATE TABLE IF NOT EXISTS writing_sessions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL DEFAULT 'laptop',
  screen_resolution TEXT NOT NULL DEFAULT 'unknown',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'locked', 'submitted')),
  hmac_key_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS keystroke_events (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES writing_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  key_code TEXT,
  dwell_ms INTEGER,
  flight_ms INTEGER,
  paste_chars INTEGER NOT NULL DEFAULT 0,
  cumulative_paste_chars INTEGER NOT NULL DEFAULT 0,
  blur_count_delta INTEGER NOT NULL DEFAULT 0,
  timestamp_ms BIGINT NOT NULL,
  raw_payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_keystroke_events_session_id ON keystroke_events(session_id);
CREATE INDEX IF NOT EXISTS idx_keystroke_events_timestamp_ms ON keystroke_events(timestamp_ms);

CREATE TABLE IF NOT EXISTS session_metrics (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE REFERENCES writing_sessions(id) ON DELETE CASCADE,
  avg_dwell_ms NUMERIC(10, 2),
  avg_flight_ms NUMERIC(10, 2),
  wpm NUMERIC(10, 2),
  revision_rate NUMERIC(10, 4),
  paste_count INTEGER NOT NULL DEFAULT 0,
  paste_chars_total INTEGER NOT NULL DEFAULT 0,
  blur_count INTEGER NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_baselines (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL,
  mean_wpm NUMERIC(10, 2),
  stddev_wpm NUMERIC(10, 2),
  mean_dwell_ms NUMERIC(10, 2),
  stddev_dwell_ms NUMERIC(10, 2),
  mean_flight_ms NUMERIC(10, 2),
  stddev_flight_ms NUMERIC(10, 2),
  mean_revision_rate NUMERIC(10, 4),
  stddev_revision_rate NUMERIC(10, 4),
  mean_paste_chars NUMERIC(10, 2),
  stddev_paste_chars NUMERIC(10, 2),
  session_count INTEGER NOT NULL DEFAULT 0,
  is_calibrated BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, course_id, device_type)
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE REFERENCES writing_sessions(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  content_text TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS content_text TEXT;

CREATE TABLE IF NOT EXISTS anomaly_flags (
  id TEXT PRIMARY KEY,
  submission_id TEXT REFERENCES submissions(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES writing_sessions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wpm_z NUMERIC(10, 4),
  paste_z NUMERIC(10, 4),
  revision_z NUMERIC(10, 4),
  composite_z NUMERIC(10, 4),
  confidence_pct NUMERIC(5, 2),
  zscore_threshold_snapshot NUMERIC(6, 2),
  paste_threshold_chars_snapshot INTEGER,
  paste_triggered BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dismissed', 'escalated')),
  teacher_notes TEXT,
  student_appeal TEXT,
  flagged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

ALTER TABLE anomaly_flags
  ADD COLUMN IF NOT EXISTS wpm_z NUMERIC(10, 4),
  ADD COLUMN IF NOT EXISTS paste_z NUMERIC(10, 4),
  ADD COLUMN IF NOT EXISTS revision_z NUMERIC(10, 4),
  ADD COLUMN IF NOT EXISTS zscore_threshold_snapshot NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS paste_threshold_chars_snapshot INTEGER;

CREATE TABLE IF NOT EXISTS study_sessions (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignment_id TEXT REFERENCES assignments(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'closed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS hint_interactions (
  id TEXT PRIMARY KEY,
  study_session_id TEXT NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hint_level INTEGER NOT NULL CHECK (hint_level BETWEEN 1 AND 3),
  student_message TEXT NOT NULL,
  ai_response TEXT,
  words_typed_before INTEGER NOT NULL DEFAULT 0,
  jailbreak_detected BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mcq_responses (
  id TEXT PRIMARY KEY,
  study_session_id TEXT NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answers_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assignment_id, student_id)
);

ALTER TABLE mcq_responses
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS provenance_events (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  assignment_id TEXT REFERENCES assignments(id) ON DELETE CASCADE,
  session_id TEXT REFERENCES writing_sessions(id) ON DELETE CASCADE,
  study_session_id TEXT REFERENCES study_sessions(id) ON DELETE CASCADE,
  submission_id TEXT REFERENCES submissions(id) ON DELETE CASCADE,
  lecture_id TEXT REFERENCES course_lectures(id) ON DELETE SET NULL,
  hint_interaction_id TEXT REFERENCES hint_interactions(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'tutor_hint_used',
      'lecture_accessed',
      'large_paste_detected',
      'source_declared',
      'submission_reflection'
    )
  ),
  source_type TEXT CHECK (
    source_type IN (
      'own_draft',
      'own_notes',
      'lecture_material',
      'tutor_hint',
      'external_ai',
      'peer_discussion',
      'other'
    )
  ),
  summary_text TEXT NOT NULL DEFAULT '',
  detail_text TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS submission_reflections (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL UNIQUE REFERENCES submissions(id) ON DELETE CASCADE,
  assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES writing_sessions(id) ON DELETE CASCADE,
  declared_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  reflection_text TEXT NOT NULL DEFAULT '',
  transformation_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consents_user_id ON consents(user_id);
CREATE INDEX IF NOT EXISTS idx_course_lectures_course_id ON course_lectures(course_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_writing_sessions_student_id ON writing_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_assignment ON submissions(student_id, assignment_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_flags_student_id ON anomaly_flags(student_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_anomaly_flags_session_id_unique ON anomaly_flags(session_id);
CREATE INDEX IF NOT EXISTS idx_hint_interactions_session_id ON hint_interactions(study_session_id);
CREATE INDEX IF NOT EXISTS idx_mcq_responses_assignment_student ON mcq_responses(assignment_id, student_id);
CREATE INDEX IF NOT EXISTS idx_provenance_events_student_id ON provenance_events(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_provenance_events_course_id ON provenance_events(course_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_provenance_events_session_id ON provenance_events(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_provenance_events_assignment_id ON provenance_events(assignment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submission_reflections_student_id ON submission_reflections(student_id, updated_at DESC);
