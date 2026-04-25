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
    displayName: "Course Teacher"
  },
  {
    email: "student1@guardrail.local",
    password: "password123",
    role: "student",
    displayName: "Student One"
  },
  {
    email: "student2@guardrail.local",
    password: "password123",
    role: "student",
    displayName: "Student Two"
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

async function upsertCourse({ teacherId, title, code }) {
  const existing = await query("SELECT id FROM courses WHERE code = $1 LIMIT 1", [code]);

  if (existing.rows[0]) {
    const result = await query(
      `UPDATE courses
       SET teacher_id = $2, title = $3, is_active = TRUE
       WHERE code = $1
       RETURNING id, code, title`,
      [code, teacherId, title]
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

async function ensureEnrollment(courseId, studentId) {
  await query(
    `INSERT INTO enrollments (id, course_id, student_id, enrolled_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (course_id, student_id) DO NOTHING`,
    [uuidv4(), courseId, studentId, new Date().toISOString()]
  );
}

async function ensureAssignment({ courseId, createdBy, title, prompt }) {
  const existing = await query(
    `SELECT id FROM assignments WHERE course_id = $1 AND title = $2 LIMIT 1`,
    [courseId, title]
  );

  if (existing.rows[0]) {
    const result = await query(
      `UPDATE assignments
       SET prompt = $2, created_by = $3
       WHERE id = $1
       RETURNING id, title`,
      [existing.rows[0].id, prompt, createdBy]
    );

    return result.rows[0];
  }

  const result = await query(
    `INSERT INTO assignments (
       id, course_id, created_by, title, prompt, max_hint_level, min_words_for_hint,
       zscore_threshold, paste_threshold_chars, due_at, created_at
     )
     VALUES ($1, $2, $3, $4, $5, 3, 50, 3.00, 400, NULL, $6)
     RETURNING id, title`,
    [uuidv4(), courseId, createdBy, title, prompt, new Date().toISOString()]
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
    title: "Academic Writing 101",
    code: "AW101"
  });

  await ensureEnrollment(course.id, seededUsers["student1@guardrail.local"].id);
  await ensureEnrollment(course.id, seededUsers["student2@guardrail.local"].id);

  const assignment = await ensureAssignment({
    courseId: course.id,
    createdBy: seededUsers.teacher.id,
    title: "Reflective Essay 1",
    prompt: "Write a reflective essay discussing how AI tools should be used responsibly in academic study."
  });

  await ensureConsent(seededUsers["student1@guardrail.local"].id, policy.version);
  await ensureConsent(seededUsers["student2@guardrail.local"].id, policy.version);

  console.log("Seed complete.");
  console.log(`Admin: admin@guardrail.local / password123`);
  console.log(`Teacher: teacher@guardrail.local / password123`);
  console.log(`Students: student1@guardrail.local, student2@guardrail.local / password123`);
  console.log(`Course: ${course.code} (${course.id})`);
  console.log(`Assignment: ${assignment.title} (${assignment.id})`);
}

runSeed()
  .catch((error) => {
    console.error("Seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
