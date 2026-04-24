# Guardrail LMS Schema

This schema is based on the MVP ERD for the standalone student-project version of Guardrail LMS.

It describes each table, its purpose, primary key, foreign keys, and important notes. It does not include SQL yet.

## 1. `USERS`

**Purpose**

Stores all system accounts, including students, teachers, and admins.

**Primary Key**

- `id`

**Fields**

- `id`
- `email`
- `password_hash`
- `role`
- `display_name`
- `status`
- `created_at`
- `updated_at`

**Notes**

- `email` should be unique.
- `role` should be limited to `student`, `teacher`, or `admin`.

## 2. `CONSENTS`

**Purpose**

Stores whether a user has accepted the monitoring consent for the prototype.

**Primary Key**

- `id`

**Foreign Keys**

- `user_id` references `USERS.id`

**Fields**

- `id`
- `user_id`
- `accepted`
- `policy_version`
- `accepted_at`

**Notes**

- For the MVP, `policy_version` can be a simple text value instead of a separate table.
- Usually one latest consent record per user is enough for the prototype.

## 3. `COURSES`

**Purpose**

Stores courses created and managed by teachers.

**Primary Key**

- `id`

**Foreign Keys**

- `teacher_id` references `USERS.id`

**Fields**

- `id`
- `teacher_id`
- `title`
- `code`
- `is_active`
- `created_at`

**Notes**

- `code` should be unique.
- One teacher can manage many courses.

## 4. `ENROLLMENTS`

**Purpose**

Links students to courses.

**Primary Key**

- `id`

**Foreign Keys**

- `course_id` references `COURSES.id`
- `student_id` references `USERS.id`

**Fields**

- `id`
- `course_id`
- `student_id`
- `enrolled_at`

**Notes**

- Use a unique pair on `course_id` and `student_id` so the same student is not enrolled twice in one course.

## 5. `ASSIGNMENTS`

**Purpose**

Stores assessed tasks created inside a course.

**Primary Key**

- `id`

**Foreign Keys**

- `course_id` references `COURSES.id`
- `created_by` references `USERS.id`

**Fields**

- `id`
- `course_id`
- `created_by`
- `title`
- `prompt`
- `max_hint_level`
- `min_words_for_hint`
- `zscore_threshold`
- `paste_threshold_chars`
- `due_at`
- `created_at`

**Notes**

- `created_by` will usually be a teacher.
- This table stores both assignment content and rule settings used by Guardrail logic.

## 6. `WRITING_SESSIONS`

**Purpose**

Stores each monitored assessed writing session.

**Primary Key**

- `id`

**Foreign Keys**

- `assignment_id` references `ASSIGNMENTS.id`
- `student_id` references `USERS.id`

**Fields**

- `id`
- `assignment_id`
- `student_id`
- `device_type`
- `screen_resolution`
- `status`
- `hmac_key_id`
- `started_at`
- `ended_at`
- `submitted_at`

**Notes**

- This is the parent table for keystroke telemetry.
- `status` can represent states such as active, completed, or locked.

## 7. `KEYSTROKE_EVENTS`

**Purpose**

Stores raw telemetry events captured during monitored writing.

**Primary Key**

- `id`

**Foreign Keys**

- `session_id` references `WRITING_SESSIONS.id`

**Fields**

- `id`
- `session_id`
- `event_type`
- `key_code`
- `dwell_ms`
- `flight_ms`
- `paste_chars`
- `cumulative_paste_chars`
- `blur_count_delta`
- `timestamp_ms`

**Notes**

- This will be the largest table in the system.
- `event_type` should support values like `keydown`, `keyup`, `paste`, and `blur`.
- For larger datasets, this is the first table to partition or optimize.

## 8. `SESSION_METRICS`

**Purpose**

Stores the computed summary metrics for one writing session.

**Primary Key**

- `id`

**Foreign Keys**

- `session_id` references `WRITING_SESSIONS.id`

**Fields**

- `id`
- `session_id`
- `avg_dwell_ms`
- `avg_flight_ms`
- `wpm`
- `revision_rate`
- `paste_count`
- `paste_chars_total`
- `blur_count`
- `computed_at`

**Notes**

- This table is produced from `KEYSTROKE_EVENTS`.
- Ideally each writing session has one final metrics row.

## 9. `STUDENT_BASELINES`

**Purpose**

Stores the historical typing baseline used for anomaly comparison.

**Primary Key**

- `id`

**Foreign Keys**

- `student_id` references `USERS.id`
- `course_id` references `COURSES.id`

**Fields**

- `id`
- `student_id`
- `course_id`
- `device_type`
- `mean_wpm`
- `stddev_wpm`
- `mean_dwell_ms`
- `stddev_dwell_ms`
- `mean_flight_ms`
- `stddev_flight_ms`
- `mean_revision_rate`
- `stddev_revision_rate`
- `mean_paste_chars`
- `stddev_paste_chars`
- `session_count`
- `is_calibrated`
- `updated_at`

**Notes**

- Baselines should be unique per `student_id`, `course_id`, and `device_type`.
- `is_calibrated` becomes true once enough sessions have been collected.

## 10. `SUBMISSIONS`

**Purpose**

Stores final submission metadata for an assignment.

**Primary Key**

- `id`

**Foreign Keys**

- `assignment_id` references `ASSIGNMENTS.id`
- `student_id` references `USERS.id`
- `session_id` references `WRITING_SESSIONS.id`

**Fields**

- `id`
- `assignment_id`
- `student_id`
- `session_id`
- `file_url`
- `status`
- `submitted_at`

**Notes**

- This stores the file location only, not the actual file content.
- The actual file should be stored in S3-compatible storage.

## 11. `ANOMALY_FLAGS`

**Purpose**

Stores flags raised when a writing session looks suspicious according to the detection rules.

**Primary Key**

- `id`

**Foreign Keys**

- `submission_id` references `SUBMISSIONS.id`
- `session_id` references `WRITING_SESSIONS.id`
- `student_id` references `USERS.id`

**Fields**

- `id`
- `submission_id`
- `session_id`
- `student_id`
- `composite_z`
- `confidence_pct`
- `paste_triggered`
- `status`
- `teacher_notes`
- `student_appeal`
- `flagged_at`
- `reviewed_at`

**Notes**

- In the MVP, `student_appeal` is stored directly here instead of using a separate appeals table.
- `status` can be `pending`, `dismissed`, or `escalated`.

## 12. `STUDY_SESSIONS`

**Purpose**

Stores non-assessed practice or tutor sessions.

**Primary Key**

- `id`

**Foreign Keys**

- `course_id` references `COURSES.id`
- `student_id` references `USERS.id`
- `assignment_id` references `ASSIGNMENTS.id`

**Fields**

- `id`
- `course_id`
- `student_id`
- `assignment_id`
- `status`
- `started_at`
- `ended_at`

**Notes**

- This is separate from `WRITING_SESSIONS` because study mode and assessed mode have different workflows.

## 13. `HINT_INTERACTIONS`

**Purpose**

Stores Socratic tutor requests and responses during study sessions.

**Primary Key**

- `id`

**Foreign Keys**

- `study_session_id` references `STUDY_SESSIONS.id`
- `student_id` references `USERS.id`

**Fields**

- `id`
- `study_session_id`
- `student_id`
- `hint_level`
- `student_message`
- `ai_response`
- `words_typed_before`
- `jailbreak_detected`
- `created_at`

**Notes**

- Each row represents one hint request and one tutor response.
- `hint_level` supports the staged Socratic flow.

## Relationship Summary

- One `USER` can teach many `COURSES`.
- One `COURSE` can have many `ENROLLMENTS`.
- One `COURSE` can contain many `ASSIGNMENTS`.
- One `ASSIGNMENT` can have many `WRITING_SESSIONS` and `SUBMISSIONS`.
- One `WRITING_SESSION` can have many `KEYSTROKE_EVENTS`.
- One `WRITING_SESSION` should produce one `SESSION_METRICS` row.
- One student can have one baseline per `course + device_type`.
- One `STUDY_SESSION` can contain many `HINT_INTERACTIONS`.

## Suggested MVP Constraints

- Unique `USERS.email`
- Unique `COURSES.code`
- Unique `ENROLLMENTS(course_id, student_id)`
- Unique `STUDENT_BASELINES(student_id, course_id, device_type)`
- Optional unique `SUBMISSIONS(assignment_id, student_id)` if you allow only one final submission per assignment

## Suggested Build Order

1. `USERS`
2. `CONSENTS`
3. `COURSES`
4. `ENROLLMENTS`
5. `ASSIGNMENTS`
6. `WRITING_SESSIONS`
7. `KEYSTROKE_EVENTS`
8. `SESSION_METRICS`
9. `STUDENT_BASELINES`
10. `SUBMISSIONS`
11. `ANOMALY_FLAGS`
12. `STUDY_SESSIONS`
13. `HINT_INTERACTIONS`
