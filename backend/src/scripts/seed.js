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
  mcqQuestions = [],
  maxHintLevel = 3,
  minWordsForHint = 0,
  zscoreThreshold = null,
  pasteThresholdChars = null,
  dueAt = null,
}) {
  let existing = await query(
    `SELECT id FROM assignments WHERE course_id = $1 AND title = $2 LIMIT 1`,
    [courseId, title]
  );

  if (existing.rows[0]) {
    const result = await query(
      `UPDATE assignments
       SET title = $2,
           prompt = $3,
           mcq_questions = $4::jsonb,
           created_by = $5,
           assignment_type = $6,
           max_hint_level = $7,
           min_words_for_hint = $8,
           zscore_threshold = $9,
           paste_threshold_chars = $10,
           due_at = $11
       WHERE id = $1
       RETURNING id, title, assignment_type`,
      [
        existing.rows[0].id,
        title,
        prompt,
        JSON.stringify(mcqQuestions || []),
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
       id, course_id, created_by, assignment_type, title, prompt, mcq_questions, max_hint_level, min_words_for_hint,
       zscore_threshold, paste_threshold_chars, due_at, created_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, $13)
     RETURNING id, title, assignment_type`,
    [
      uuidv4(),
      courseId,
      createdBy,
      assignmentType,
      title,
      prompt,
      JSON.stringify(mcqQuestions || []),
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
    title: "English Language Skills",
    code: "ENG201"
  });

  await ensureEnrollment(course.id, seededUsers["student1@guardrail.local"].id);
  await ensureEnrollment(course.id, seededUsers["student2@guardrail.local"].id);

  const assignments = await Promise.all([
    ensureAssignment({
      courseId: course.id,
      createdBy: seededUsers.teacher.id,
      assignmentType: "essay",
      title: "Essay: Writing a Formal Email",
      prompt:
        "Write a formal email to your course lecturer requesting a deadline extension. Explain your situation clearly, use an appropriate tone, and organize the email with a subject line, greeting, body, and closing.",
      maxHintLevel: 3,
      minWordsForHint: 0,
      zscoreThreshold: 3.0,
      pasteThresholdChars: 350,
      dueAt: daysFromNow(7)
    }),
    ensureAssignment({
      courseId: course.id,
      createdBy: seededUsers.teacher.id,
      assignmentType: "mcq",
      title: "MCQ: Reading Comprehension and Vocabulary in Context",
      prompt:
        "Answer the reading and vocabulary questions in the panel. Use the AI tutor only when you need guided hints, elimination strategies, or help understanding why an option may be weaker than another.",
      mcqQuestions: [
        {
          id: "reading-main-idea",
          prompt:
            "Read the sentence: 'Although Lina had planned to spend Saturday resting, she volunteered at the library because the community reading program was short-staffed.' What is the main idea?",
          options: [
            { id: "A", text: "Lina dislikes community programs." },
            { id: "B", text: "Lina changed her plan in order to help others." },
            { id: "C", text: "The library was closed on Saturday." },
            { id: "D", text: "Lina was forced to work for the library." }
          ],
          correctOption: "B",
          explanation: "The sentence contrasts Lina's original plan with her voluntary decision to help the reading program."
        },
        {
          id: "vocab-context",
          prompt:
            "In the sentence 'The teacher's feedback was concise but helpful,' what does the word 'concise' most nearly mean?",
          options: [
            { id: "A", text: "Too confusing to understand" },
            { id: "B", text: "Short and clear" },
            { id: "C", text: "Strongly critical" },
            { id: "D", text: "Written in a formal style" }
          ],
          correctOption: "B",
          explanation: "Concise means brief while still including the necessary information."
        },
        {
          id: "author-purpose",
          prompt:
            "A paragraph explains the benefits of reading every day and ends by encouraging students to carry a book with them. Which option best shows the writer's purpose?",
          options: [
            { id: "A", text: "To entertain readers with a fictional story" },
            { id: "B", text: "To persuade students to build a reading habit" },
            { id: "C", text: "To compare two different authors" },
            { id: "D", text: "To describe how a library building was designed" }
          ],
          correctOption: "B",
          explanation: "The paragraph presents benefits and then encourages action, which signals persuasion."
        }
      ],
      maxHintLevel: 3,
      minWordsForHint: 0,
      zscoreThreshold: null,
      pasteThresholdChars: null,
      dueAt: daysFromNow(5)
    }),
    ensureAssignment({
      courseId: course.id,
      createdBy: seededUsers.teacher.id,
      assignmentType: "mcq",
      title: "MCQ: Grammar, Tenses, and Sentence Correction",
      prompt:
        "Answer the grammar questions in the panel. Use the AI tutor for Socratic hints, grammar rules, and elimination help without asking for the final answer directly.",
      mcqQuestions: [
        {
          id: "verb-tense",
          prompt: "Choose the sentence with the correct verb tense.",
          options: [
            { id: "A", text: "She go to class early yesterday." },
            { id: "B", text: "She gone to class early yesterday." },
            { id: "C", text: "She went to class early yesterday." },
            { id: "D", text: "She going to class early yesterday." }
          ],
          correctOption: "C",
          explanation: "The time marker 'yesterday' requires the simple past tense: 'went'."
        },
        {
          id: "subject-verb",
          prompt: "Choose the sentence with correct subject-verb agreement.",
          options: [
            { id: "A", text: "The list of books are on the desk." },
            { id: "B", text: "The list of books is on the desk." },
            { id: "C", text: "The list of books were on the desk." },
            { id: "D", text: "The list of books be on the desk." }
          ],
          correctOption: "B",
          explanation: "The singular subject is 'list', so the verb should be 'is'."
        },
        {
          id: "sentence-correction",
          prompt: "Which sentence is written correctly?",
          options: [
            { id: "A", text: "If I will see her, I tell her the news." },
            { id: "B", text: "If I see her, I will tell her the news." },
            { id: "C", text: "If I saw her, I will tell her the news." },
            { id: "D", text: "If I seen her, I would tell her the news." }
          ],
          correctOption: "B",
          explanation: "A first conditional sentence uses present simple in the if-clause and 'will' in the main clause."
        }
      ],
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
      title: "Essay: Comparing Formal and Informal English",
      prompt:
        "Write a short comparison essay explaining the difference between formal and informal English. Discuss tone, vocabulary, sentence structure, and when each style is appropriate, using clear examples.",
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
