# Scrum Board — Guardrail LMS

One-month sprint plan · 4 sprints · Team of 2–3

> **How to use this board:** Each sprint has its own section below. Move tasks through the Kanban database as you work. Run a 15-min standup daily and a Sprint Review + Retrospective every Friday.
> 

---

## 🗓 Sprint Overview

| Sprint | Focus | Dates | Goal |
| --- | --- | --- | --- |
| Sprint 1 | Foundation & Auth | Apr 1–7 | DB, auth, telemetry editor working end-to-end |
| Sprint 2 | Anomaly Detection Engine | Apr 8–14 | Z-score pipeline + teacher/student dashboards |
| Sprint 3 | Socratic Tutor (Claude API) | Apr 15–21 | AI tutor with hint levels, effort gate, jailbreak detection |
| Sprint 4 | Polish, Testing & Demo | Apr 22–30 | Harden, test, export report, demo-ready |

---

## 🔴 Sprint 1 · Foundation & Auth · Apr 1–7

**Sprint Goal:** Get the skeleton running — DB schema, auth system, and the monitored text editor working end-to-end.

**Deliverable:** A student can register, accept consent, open an assignment, and type — telemetry flows to the backend and is stored in the DB.

### Person A — Backend

- [ ]  Set up PostgreSQL schema (users, sessions, keystroke_events, baselines, consent_logs)
- [ ]  JWT auth with bcrypt cost ≥ 12 — register, login, role-based routes (FR-01)
- [ ]  Versioned consent form endpoint + immutable consent log (FR-02)
- [ ]  HMAC-SHA256 payload verification — reject unsigned payloads with HTTP 401 (FR-04)
- [ ]  Docker setup + deploy to Railway/Render

### Person B — Frontend

- [ ]  React app scaffold — routing, auth pages, role guards
- [ ]  Consent form UI — student must accept before editor loads (FR-02)
- [ ]  Monitored text editor — capture dwell time, flight time, paste events, blur events (FR-03)
- [ ]  HMAC-SHA256 payload signing on the client side (FR-04)
- [ ]  Batch telemetry send every 5 seconds

### Scrum Ceremonies

- 📋 **Sprint Planning** — Mon Apr 1
- 🔄 **Daily Standup** — 15 min every day (what did I do, what am I doing, what's blocking me)
- 📊 **Sprint Review** — Fri Apr 7
- 🔁 **Retrospective** — Fri Apr 7 (what went well, what to improve)

---

## 🟣 Sprint 2 · Anomaly Detection Engine · Apr 8–14

**Sprint Goal:** Build the full integrity monitor pipeline — from raw keystrokes to Z-score flags visible to teachers.

**Deliverable:** A student submits an assignment. After 3 sessions the anomaly engine runs. Teachers can see the flag with full Z-score context and take action.

### Person A — Backend

- [ ]  Background job: compute session metrics — WPM, dwell, flight, revision rate, paste count, blur count (FR-05)
- [ ]  Baseline UPSERT per student/course/device — increment session_count, set is_calibrated = TRUE at 3 (FR-06)
- [ ]  Z-score engine: per-metric + weighted composite (WPM 40%, paste 35%, revision 25%), flag at Z > 3 (FR-07)
- [ ]  Paste-volume independent flag trigger — track cumulative_chars per session (FR-09)
- [ ]  Confidence % on every flag — never binary verdict (FR-08)

### Person B — Frontend

- [ ]  Teacher dashboard — class overview, pending flag count, per-student drill-down (FR-10)
- [ ]  Flag detail view — Z-score breakdown, paste timeline, dismiss/escalate buttons (FR-08, FR-10)
- [ ]  Student transparency dashboard — typing trends, calibration badge, own flags only (FR-11)
- [ ]  Submission flow — upload to S3, lock session on success (FR-13)
- [ ]  Student appeal submission form (FR-12)

### Scrum Ceremonies

- 📋 **Sprint Planning** — Mon Apr 8
- 🔄 **Daily Standup** — 15 min every day
- 📊 **Sprint Review** — Fri Apr 11
- 🔁 **Retrospective** — Fri Apr 11

> ⚠️ **Risk note:** This is the highest-risk sprint. The Z-score engine and calibration gate logic are non-trivial. If running behind, cut S3 file upload temporarily and use local storage as a fallback.
> 

---

## 🟡 Sprint 3 · Socratic Tutor (Claude API) · Apr 15–21

**Sprint Goal:** Ship Subsystem 2 — the AI tutor with effort gating, hint levels, jailbreak detection, and full hint logging.

**Deliverable:** Students can use the Socratic tutor during study sessions. Hints escalate L1→L2→L3 only after effort is shown. Jailbreak attempts are blocked and logged.

### Person A — Backend

- [ ]  Server-side Claude API integration with Socratic system prompt (FR-19) — prompt must forbid direct answers
- [ ]  Effort gate: enforce minimum word count server-side before any Claude API call (FR-21)
- [ ]  Hint level progression logic L1 → L2 → L3, advance only after min_words_for_hint typed (FR-20)
- [ ]  Jailbreak pattern detection before API call — log jailbreak_detected = TRUE, return polite refusal (FR-22)
- [ ]  Hint interaction log: hint level, student message, AI response, jailbreak flag, words typed (FR-23)

### Person B — Frontend

- [ ]  Study session UI — chat interface, hint level indicator, effort gate message
- [ ]  Max hint level message — suggest consulting teacher or course materials (FR-24)
- [ ]  Hint usage log visible to teacher on class dashboard (FR-23)
- [ ]  Teacher: appeal text shown alongside session data side by side (FR-12)

### Scrum Ceremonies

- 📋 **Sprint Planning** — Mon Apr 15
- 🔄 **Daily Standup** — 15 min every day
- 📊 **Sprint Review** — Fri Apr 18
- 🔁 **Retrospective** — Fri Apr 18

> ⚠️ **Risk note:** Budget 1–2 days just for system prompt iteration. Getting the Socratic constraint right (refuses direct answers without being useless) takes testing.
> 

---

## 🔴 Sprint 4 · Polish, Testing & Demo · Apr 22–30

**Sprint Goal:** Harden security, fix bugs, write tests, stress-test jailbreaks, and prepare the final demo.

**Deliverable:** Fully working prototype of both subsystems. Tests documented. Demo ready for academic evaluation.

### Person A — Backend

- [ ]  Redis rate limiting on login endpoint — 10 failed attempts per 15-min window per IP (FR-17)
- [ ]  Row-level isolation tests — verify student cannot access any other student's data (NFR-S4)
- [ ]  Red-team jailbreak stress test — 10+ known jailbreak patterns, document results (FR-25)
- [ ]  Export integrity report as PDF or CSV (FR-14)
- [ ]  Handle stddev = 0 edge case in Z-score engine defensively (return null confidence)

### Person B — Frontend

- [ ]  Admin panel — user account management, global Z-score threshold config (UC-A1, UC-A3)
- [ ]  Bug fixes from Sprint 3 Review feedback
- [ ]  End-to-end test: student → submission → flag → teacher review → student appeal → teacher decision
- [ ]  Demo script covering both subsystems
- [ ]  Final deployment and smoke test on production URL

### Scrum Ceremonies

- 📋 **Sprint Planning** — Mon Apr 22
- 🔄 **Daily Standup** — 15 min every day
- 📊 **Sprint Review** — Wed Apr 29
- 🔁 **Final Retrospective** — Wed Apr 29

---

## 🚫 Won't Build This Month (Deferred)

These are MoSCoW **Should/Could** items — cut them if time is tight, they will not affect the Must-have prototype:

- FR-16 — Weekly keystroke_events partition rotation
- UC-A2 — Bulk student enrollment via CSV upload
- FR-18 — In-app notifications for high-confidence flags (≥ 80%)
- FR-26 — Per-topic conversation context in the Socratic tutor
- FR-15 — Student data deletion request flow

---

## 📌 Key Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Cold-start: no detection until 3+ sessions | High | Calibration gate enforced, Calibrating badge shown |
| Z-score division by zero on first session | Critical | Gate prevents engine running until session_count ≥ 3 |
| Jailbreak bypass of Socratic tutor | High | Server-side prompt + red-team 10+ patterns in Sprint 4 |
| Sprint 2 running over time | High | Cut S3 upload temporarily, use local fallback |
| Prompt iteration taking too long | Medium | Budget 1–2 days in Sprint 3 for prompt testing only |

[Sprint 1 · Foundation & Auth · Apr 1–7](https://www.notion.so/Sprint-1-Foundation-Auth-Apr-1-7-33514fd7c8e8810691b5e4ef6905b6fe?pvs=21)

[Sprint 2 · Anomaly Detection Engine · Apr 8–14](https://www.notion.so/Sprint-2-Anomaly-Detection-Engine-Apr-8-14-33514fd7c8e881718278dd15251022df?pvs=21)

[Sprint 3 · Socratic Tutor (Claude API) · Apr 15–21](https://www.notion.so/Sprint-3-Socratic-Tutor-Claude-API-Apr-15-21-33514fd7c8e881e08fb0fd70645235e6?pvs=21)

[Sprint 4 · Polish, Testing & Demo · Apr 22–30](https://www.notion.so/Sprint-4-Polish-Testing-Demo-Apr-22-30-33514fd7c8e881b48ffbede7e1da43ec?pvs=21)