# Guardrail LMS ERD

This is a report-ready MVP ERD for the standalone student-project version of Guardrail LMS.

It keeps only the core features:
- user roles
- courses and enrollments
- assignments and submissions
- monitored writing sessions and keystroke telemetry
- session metrics, baselines, and anomaly flags
- study sessions and Socratic hint logs

It intentionally leaves out more advanced production entities such as policy version tables, audit logs, deletion requests, and prompt version management.

```mermaid
erDiagram
    USERS {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar role "student, teacher, admin"
        varchar display_name
        varchar status
        timestamp created_at
        timestamp updated_at
    }

    CONSENTS {
        uuid id PK
        uuid user_id FK
        boolean accepted
        varchar policy_version
        timestamp accepted_at
    }

    COURSES {
        uuid id PK
        uuid teacher_id FK
        varchar title
        varchar code UK
        boolean is_active
        timestamp created_at
    }

    ENROLLMENTS {
        uuid id PK
        uuid course_id FK
        uuid student_id FK
        timestamp enrolled_at
    }

    ASSIGNMENTS {
        uuid id PK
        uuid course_id FK
        uuid created_by FK
        varchar title
        text prompt
        int max_hint_level
        int min_words_for_hint
        numeric zscore_threshold
        int paste_threshold_chars
        timestamp due_at
        timestamp created_at
    }

    WRITING_SESSIONS {
        uuid id PK
        uuid assignment_id FK
        uuid student_id FK
        varchar device_type
        varchar screen_resolution
        varchar status
        varchar hmac_key_id
        timestamp started_at
        timestamp ended_at
        timestamp submitted_at
    }

    KEYSTROKE_EVENTS {
        uuid id PK
        uuid session_id FK
        varchar event_type "keydown, keyup, paste, blur"
        varchar key_code
        int dwell_ms
        int flight_ms
        int paste_chars
        int cumulative_paste_chars
        int blur_count_delta
        bigint timestamp_ms
    }

    SESSION_METRICS {
        uuid id PK
        uuid session_id FK
        numeric avg_dwell_ms
        numeric avg_flight_ms
        numeric wpm
        numeric revision_rate
        int paste_count
        int paste_chars_total
        int blur_count
        timestamp computed_at
    }

    STUDENT_BASELINES {
        uuid id PK
        uuid student_id FK
        uuid course_id FK
        varchar device_type
        numeric mean_wpm
        numeric stddev_wpm
        numeric mean_dwell_ms
        numeric stddev_dwell_ms
        numeric mean_flight_ms
        numeric stddev_flight_ms
        numeric mean_revision_rate
        numeric stddev_revision_rate
        numeric mean_paste_chars
        numeric stddev_paste_chars
        int session_count
        boolean is_calibrated
        timestamp updated_at
    }

    SUBMISSIONS {
        uuid id PK
        uuid assignment_id FK
        uuid student_id FK
        uuid session_id FK
        varchar file_url
        varchar status "draft, submitted, locked"
        timestamp submitted_at
    }

    ANOMALY_FLAGS {
        uuid id PK
        uuid submission_id FK
        uuid session_id FK
        uuid student_id FK
        numeric composite_z
        int confidence_pct
        boolean paste_triggered
        varchar status "pending, dismissed, escalated"
        text teacher_notes
        text student_appeal
        timestamp flagged_at
        timestamp reviewed_at
    }

    STUDY_SESSIONS {
        uuid id PK
        uuid course_id FK
        uuid student_id FK
        uuid assignment_id FK
        varchar status
        timestamp started_at
        timestamp ended_at
    }

    HINT_INTERACTIONS {
        uuid id PK
        uuid study_session_id FK
        uuid student_id FK
        int hint_level
        text student_message
        text ai_response
        int words_typed_before
        boolean jailbreak_detected
        timestamp created_at
    }

    USERS ||--o{ CONSENTS : accepts

    USERS ||--o{ COURSES : teaches
    COURSES ||--o{ ENROLLMENTS : has
    USERS ||--o{ ENROLLMENTS : joins

    COURSES ||--o{ ASSIGNMENTS : contains
    USERS ||--o{ ASSIGNMENTS : creates

    ASSIGNMENTS ||--o{ WRITING_SESSIONS : has
    USERS ||--o{ WRITING_SESSIONS : writes
    WRITING_SESSIONS ||--o{ KEYSTROKE_EVENTS : records
    WRITING_SESSIONS ||--o| SESSION_METRICS : summarized_by

    USERS ||--o{ STUDENT_BASELINES : owns
    COURSES ||--o{ STUDENT_BASELINES : scoped_to

    ASSIGNMENTS ||--o{ SUBMISSIONS : receives
    USERS ||--o{ SUBMISSIONS : submits
    WRITING_SESSIONS ||--o| SUBMISSIONS : finalizes

    SUBMISSIONS ||--o| ANOMALY_FLAGS : may_have
    WRITING_SESSIONS ||--o| ANOMALY_FLAGS : may_trigger
    USERS ||--o{ ANOMALY_FLAGS : affects

    COURSES ||--o{ STUDY_SESSIONS : has
    USERS ||--o{ STUDY_SESSIONS : starts
    ASSIGNMENTS ||--o{ STUDY_SESSIONS : related_to
    STUDY_SESSIONS ||--o{ HINT_INTERACTIONS : contains
    USERS ||--o{ HINT_INTERACTIONS : requests
```

## Why This Version Fits The Project

- It is small enough to implement in a month.
- It still covers the unique Guardrail features instead of becoming a generic LMS.
- It avoids overengineering tables that are useful in production but not essential for a student prototype.

## Main Entity Groups

- Core LMS: `USERS`, `COURSES`, `ENROLLMENTS`, `ASSIGNMENTS`, `SUBMISSIONS`
- Integrity Monitor: `WRITING_SESSIONS`, `KEYSTROKE_EVENTS`, `SESSION_METRICS`, `STUDENT_BASELINES`, `ANOMALY_FLAGS`
- Socratic Tutor: `STUDY_SESSIONS`, `HINT_INTERACTIONS`
- Consent: `CONSENTS`

## Entities Intentionally Removed For Now

- `CONSENT_POLICY_VERSIONS`
- `USER_CONSENTS` as a separate versioned consent history model
- `FLAG_METRIC_BREAKDOWNS`
- `FLAG_APPEALS` as a separate workflow table
- `PROMPT_VERSIONS`
- `DELETION_REQUESTS`
- `AUDIT_LOGS`

## Notes

- `KEYSTROKE_EVENTS` is still the largest table and should be treated as the high-volume telemetry table.
- `STUDENT_BASELINES` should be unique by `student_id`, `course_id`, and `device_type`.
- `SUBMISSIONS` stores only the file location, not the raw file content.
- If your scope gets tighter, the first optional cut should be `student_appeal` workflow detail, not the telemetry core.
