const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const env = require("../config/env");
const { closeDatabase, initializeDatabase, query } = require("../db");
const { ensureDefaultPolicy, getActivePolicy } = require("../data/consent-policy.store");

const seedUsers = [
  {
    email: "admin@guardrail.local",
    password: "password123",
    role: "admin",
    displayName: "Guardrail Admin"
  },
  {
    email: "teacher@guardrail.local",
    password: "password123",
    role: "teacher",
    displayName: "Dr. Sahan Perera"
  },
  {
    email: "student1@guardrail.local",
    password: "password123",
    role: "student",
    displayName: "Anika De Silva"
  },
  {
    email: "student2@guardrail.local",
    password: "password123",
    role: "student",
    displayName: "Milan Fernando"
  }
];

async function upsertUser(user) {
  const passwordHash = await bcrypt.hash(user.password, env.bcryptRounds);
  const now = new Date().toISOString();

  const result = await query(
    `INSERT INTO users (id, email, password_hash, role, display_name, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 'active', $6, $7)
     ON CONFLICT (email) DO UPDATE
     SET password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role,
         display_name = EXCLUDED.display_name,
         updated_at = EXCLUDED.updated_at
     RETURNING id, email, role, display_name`,
    [uuidv4(), user.email, passwordHash, user.role, user.displayName, now, now]
  );

  return result.rows[0];
}

async function upsertCourse({ teacherId, title, code, legacyCodes = [] }) {
  let existing = await query("SELECT id FROM courses WHERE code = $1 LIMIT 1", [code]);

  if (!existing.rows[0] && legacyCodes.length > 0) {
    existing = await query("SELECT id FROM courses WHERE code = ANY($1::text[]) LIMIT 1", [legacyCodes]);
  }

  if (existing.rows[0]) {
    const result = await query(
      `UPDATE courses
       SET teacher_id = $2, title = $3, code = $4, is_active = TRUE
       WHERE id = $1
       RETURNING id, code, title`,
      [existing.rows[0].id, teacherId, title, code]
    );

    return result.rows[0];
  }

  const result = await query(
    `INSERT INTO courses (id, teacher_id, title, code, is_active, created_at)
     VALUES ($1, $2, $3, $4, TRUE, $5)
     RETURNING id, code, title`,
    [uuidv4(), teacherId, title, code, new Date().toISOString()]
  );

  return result.rows[0];
}

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

async function ensureEnrollment(courseId, studentId) {
  await query(
    `INSERT INTO enrollments (id, course_id, student_id, enrolled_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (course_id, student_id) DO NOTHING`,
    [uuidv4(), courseId, studentId, new Date().toISOString()]
  );
}

async function ensureAssignment({
  courseId,
  createdBy,
  assignmentType = "essay",
  title,
  prompt,
  maxHintLevel = 3,
  minWordsForHint = 0,
  zscoreThreshold = null,
  pasteThresholdChars = null,
  dueAt = null,
  legacyTitles = []
}) {
  let existing = await query(
    `SELECT id FROM assignments WHERE course_id = $1 AND title = $2 LIMIT 1`,
    [courseId, title]
  );

  if (!existing.rows[0] && legacyTitles.length > 0) {
    existing = await query(
      `SELECT id FROM assignments WHERE course_id = $1 AND title = ANY($2::text[]) LIMIT 1`,
      [courseId, legacyTitles]
    );
  }

  if (existing.rows[0]) {
    const result = await query(
      `UPDATE assignments
       SET title = $2,
           prompt = $3,
           created_by = $4,
           assignment_type = $5,
           max_hint_level = $6,
           min_words_for_hint = $7,
           zscore_threshold = $8,
           paste_threshold_chars = $9,
           due_at = $10
       WHERE id = $1
       RETURNING id, title, assignment_type`,
      [
        existing.rows[0].id,
        title,
        prompt,
        createdBy,
        assignmentType,
        maxHintLevel,
        minWordsForHint,
        zscoreThreshold,
        pasteThresholdChars,
        dueAt
      ]
    );

    return result.rows[0];
  }

  const result = await query(
    `INSERT INTO assignments (
       id, course_id, created_by, assignment_type, title, prompt, max_hint_level, min_words_for_hint,
       zscore_threshold, paste_threshold_chars, due_at, created_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id, title, assignment_type`,
    [
      uuidv4(),
      courseId,
      createdBy,
      assignmentType,
      title,
      prompt,
      maxHintLevel,
      minWordsForHint,
      zscoreThreshold,
      pasteThresholdChars,
      dueAt,
      new Date().toISOString()
    ]
  );

  return result.rows[0];
}

async function ensureConsent(userId, policyVersion) {
  const existing = await query(
    `SELECT id FROM consents WHERE user_id = $1 AND policy_version = $2 LIMIT 1`,
    [userId, policyVersion]
  );

  if (existing.rows[0]) {
    return;
  }

  await query(
    `INSERT INTO consents (id, user_id, accepted, policy_version, accepted_at)
     VALUES ($1, $2, TRUE, $3, $4)`,
    [uuidv4(), userId, policyVersion, new Date().toISOString()]
  );
}

async function runSeed() {
  await initializeDatabase();
  await ensureDefaultPolicy();

  const policy = await getActivePolicy();
  const seededUsers = {};

  for (const user of seedUsers) {
    const savedUser = await upsertUser(user);
    seededUsers[user.role === "student" ? user.email : user.role] = savedUser;
  }

  const course = await upsertCourse({
    teacherId: seededUsers.teacher.id,
    title: "Dental Medicine Foundations",
    code: "DENT201",
    legacyCodes: ["AW101"]
  });

  await ensureEnrollment(course.id, seededUsers["student1@guardrail.local"].id);
  await ensureEnrollment(course.id, seededUsers["student2@guardrail.local"].id);

  const assignments = await Promise.all([
    ensureAssignment({
      courseId: course.id,
      createdBy: seededUsers.teacher.id,
      assignmentType: "essay",
      title: "Essay: Infection Control Reflection",
      prompt:
        "Write a reflective essay explaining how sterilization, surface disinfection, PPE selection, and hand hygiene reduce cross-contamination risk in a dental clinic. Use a realistic chairside scenario and justify each control choice.",
      maxHintLevel: 3,
      minWordsForHint: 0,
      zscoreThreshold: 3.0,
      pasteThresholdChars: 350,
      dueAt: daysFromNow(7),
      legacyTitles: ["Reflective Essay 1"]
    }),
    ensureAssignment({
      courseId: course.id,
      createdBy: seededUsers.teacher.id,
      assignmentType: "qa",
      title: "Q&A: Tooth Eruption and FDI Numbering",
      prompt:
        "Use the Socratic tutor to reason through the eruption sequence of the permanent dentition and how to identify teeth using the FDI numbering system. Ask for guided hints rather than direct answers.",
      maxHintLevel: 3,
      minWordsForHint: 0,
      zscoreThreshold: null,
      pasteThresholdChars: null,
      dueAt: daysFromNow(5)
    }),
    ensureAssignment({
      courseId: course.id,
      createdBy: seededUsers.teacher.id,
      assignmentType: "qa",
      title: "Q&A: Local Anaesthesia Safety Checks",
      prompt:
        "Use guided questioning to work through landmarks, aspiration, contraindications, and post-injection monitoring for common dental local anaesthesia procedures.",
      maxHintLevel: 3,
      minWordsForHint: 0,
      zscoreThreshold: null,
      pasteThresholdChars: null,
      dueAt: daysFromNow(10)
    }),
    ensureAssignment({
      courseId: course.id,
      createdBy: seededUsers.teacher.id,
      assignmentType: "essay",
      title: "Essay: Managing Dental Anxiety During Extraction Counseling",
      prompt:
        "Write a short essay describing how you would communicate risks, aftercare, and anxiety-management strategies to a nervous patient before a simple extraction.",
      maxHintLevel: 3,
      minWordsForHint: 0,
      zscoreThreshold: 2.8,
      pasteThresholdChars: 300,
      dueAt: daysFromNow(14)
    })
  ]);

  await ensureConsent(seededUsers["student1@guardrail.local"].id, policy.version);
  await ensureConsent(seededUsers["student2@guardrail.local"].id, policy.version);

  console.log("Seed complete.");
  console.log(`Admin: admin@guardrail.local / password123`);
  console.log(`Teacher: teacher@guardrail.local / password123`);
  console.log(`Students: student1@guardrail.local, student2@guardrail.local / password123`);
  console.log(`Course: ${course.code} (${course.id})`);
  assignments.forEach((assignment) => {
    console.log(`Assignment: ${assignment.title} [${assignment.assignment_type}] (${assignment.id})`);
  });
}

runSeed()
  .catch((error) => {
    console.error("Seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
