const { findAssignmentById } = require("../data/assignment.store");
const { findEnrollment } = require("../data/course.store");
const { findUserById } = require("../data/user.store");
const {
  addHintInteraction,
  closeActiveStudySession,
  getLatestHintInteractionForStudySession,
  getOrCreateActiveStudySession,
  listHintInteractionsForStudent
} = require("../data/tutor.store");
const { upsertMcqResponse } = require("../data/mcq-response.store");
const { ensureCourseAccess } = require("./course.service");
const { requestSocraticHint } = require("./openai-tutor.service");
const { EVENT_TYPES } = require("../constants/provenance");
const { addProvenanceEvent } = require("../data/provenance.store");

const DEFAULT_MAX_HINT_LEVEL = 3;
const JAILBREAK_REFUSAL_MESSAGE =
  "I can't help with bypassing the tutor rules or giving direct answers. Please share your own attempt or ask a genuine study question, and I'll guide your thinking.";

function detectJailbreak(message) {
  return /ignore (all )?(previous|prior) instructions|give me (the )?(complete|full) (answer|solution|code)|jailbreak|system prompt/i.test(message);
}

function countWords(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function getMaxHintLevel(assignment) {
  return Number(assignment?.maxHintLevel || DEFAULT_MAX_HINT_LEVEL);
}

function getMinWordsForHint(assignment) {
  return Number(assignment?.minWordsForHint || 0);
}

function isTutorAssignment(assignment) {
  return ["qa", "mcq"].includes(assignment?.assignmentType);
}

function normalizeMcqAnswers(assignment, answers) {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return {};
  }

  const byQuestionId = new Map(
    (Array.isArray(assignment?.mcqQuestions) ? assignment.mcqQuestions : []).map((question) => [question.id, question])
  );

  return Object.entries(answers).reduce((acc, [questionId, optionId]) => {
    const question = byQuestionId.get(questionId);
    if (!question || typeof optionId !== "string") {
      return acc;
    }

    const optionExists = Array.isArray(question.options) && question.options.some((option) => option.id === optionId);
    if (optionExists) {
      acc[questionId] = optionId;
    }

    return acc;
  }, {});
}

async function ensureTutorStudentAccess({ user, assignmentId, courseId, requireMcq = false }) {
  if (user.role !== "student") {
    const error = new Error("Only students can access tutor workspaces.");
    error.statusCode = 403;
    throw error;
  }

  const context = await resolveTutorContext({ assignmentId, courseId });
  const assignment = context.assignment;
  const resolvedCourseId = context.courseId;

  if (assignment && !isTutorAssignment(assignment)) {
    const error = new Error("Socratic Tutor is only available for Q&A and MCQ assignments.");
    error.statusCode = 409;
    throw error;
  }

  if (requireMcq && assignment?.assignmentType !== "mcq") {
    const error = new Error("MCQ responses are only available for MCQ assignments.");
    error.statusCode = 409;
    throw error;
  }

  const enrollment = await findEnrollment(resolvedCourseId, user.id);
  if (!enrollment) {
    const error = new Error("You are not enrolled in this course.");
    error.statusCode = 403;
    throw error;
  }

  return {
    assignment,
    courseId: resolvedCourseId
  };
}

async function resolveTutorContext({ assignmentId, courseId }) {
  const assignment = assignmentId ? await findAssignmentById(assignmentId) : null;

  if (assignmentId && !assignment) {
    const error = new Error("Assignment not found.");
    error.statusCode = 404;
    throw error;
  }

  const resolvedCourseId = courseId || assignment?.courseId || null;

  if (!resolvedCourseId) {
    const error = new Error("courseId or assignmentId is required.");
    error.statusCode = 400;
    throw error;
  }

  if (assignment && assignment.courseId !== resolvedCourseId) {
    const error = new Error("Assignment not found in this course.");
    error.statusCode = 404;
    throw error;
  }

  return {
    assignment,
    courseId: resolvedCourseId
  };
}

async function requestHint({ user, assignmentId, courseId, message }) {
  if (!message || !message.trim()) {
    const error = new Error("message is required.");
    error.statusCode = 400;
    throw error;
  }

  const context = await ensureTutorStudentAccess({ user, assignmentId, courseId });
  const assignment = context.assignment;
  const resolvedCourseId = context.courseId;

  const session = await getOrCreateActiveStudySession({
    courseId: resolvedCourseId,
    studentId: user.id,
    assignmentId: assignmentId || null
  });

  const maxHintLevel = getMaxHintLevel(assignment);
  const minWordsForHint = getMinWordsForHint(assignment);
  const effectiveWordsTyped = countWords(message);
  const latestInteraction = await getLatestHintInteractionForStudySession(session.id);
  const jailbreakDetected = detectJailbreak(message);

  if (effectiveWordsTyped < minWordsForHint) {
    const error = new Error(`Please show more of your own thinking before requesting a hint. Minimum ${minWordsForHint} words required.`);
    error.statusCode = 409;
    throw error;
  }

  if (latestInteraction && latestInteraction.hintLevel >= maxHintLevel) {
    const response =
      "You have already reached the maximum hint level for this session. Please continue on your own or consult your teacher or course materials.";

    const interaction = await addHintInteraction({
      studySessionId: session.id,
      studentId: user.id,
      hintLevel: maxHintLevel,
      studentMessage: message.trim(),
      aiResponse: response,
      wordsTyped: effectiveWordsTyped,
      jailbreakDetected
    });

    return {
      id: interaction.id,
      response,
      message: response,
      hintLevel: maxHintLevel,
      jailbreakDetected,
      maxHintReached: true,
      wordsTyped: effectiveWordsTyped
    };
  }

  const level = latestInteraction
    ? Math.min(maxHintLevel, latestInteraction.hintLevel + 1)
    : 1;

  const response = jailbreakDetected
    ? JAILBREAK_REFUSAL_MESSAGE
    : await requestSocraticHint({ assignment, message, hintLevel: level });

  const interaction = await addHintInteraction({
    studySessionId: session.id,
    studentId: user.id,
    hintLevel: level,
    studentMessage: message.trim(),
    aiResponse: response,
    wordsTyped: effectiveWordsTyped,
    jailbreakDetected
  });

  await addProvenanceEvent({
    studentId: user.id,
    courseId: resolvedCourseId,
    assignmentId: assignment?.id || null,
    studySessionId: session.id,
    hintInteractionId: interaction.id,
    eventType: EVENT_TYPES.TUTOR_HINT_USED,
    summaryText: `Tutor hint used at level L${level}.`,
    detailText: jailbreakDetected
      ? "The tutor refused the request because it matched a jailbreak pattern."
      : "A Socratic hint was delivered and logged for teacher review.",
    metadata: {
      hintLevel: `L${level}`,
      jailbreakDetected,
      wordsTyped: effectiveWordsTyped
    },
    createdBy: user.id
  });

  return {
    id: interaction.id,
    response,
    message: response,
    hintLevel: level,
    jailbreakDetected,
    maxHintReached: level >= maxHintLevel,
    wordsTyped: effectiveWordsTyped
  };
}

async function markHintLimitReached({ user, assignmentId, courseId }) {
  const context = await ensureTutorStudentAccess({ user, assignmentId, courseId });

  const closedSessions = await closeActiveStudySession({
    courseId: context.courseId,
    studentId: user.id,
    assignmentId: assignmentId || null
  });

  return { closedSessions };
}

async function saveMcqAnswers({ user, assignmentId, courseId, answers, submit = false }) {
  const context = await ensureTutorStudentAccess({ user, assignmentId, courseId, requireMcq: true });
  const normalizedAnswers = normalizeMcqAnswers(context.assignment, answers);

  const session = await getOrCreateActiveStudySession({
    courseId: context.courseId,
    studentId: user.id,
    assignmentId: assignmentId || null
  });

  const response = await upsertMcqResponse({
    studySessionId: session.id,
    assignmentId: context.assignment.id,
    studentId: user.id,
    answers: normalizedAnswers,
    submittedAt: submit ? new Date().toISOString() : undefined
  });

  return response;
}

async function getStudentHintLogs({ actor, studentId, courseId }) {
  if (!courseId) {
    const error = new Error("courseId is required.");
    error.statusCode = 400;
    throw error;
  }

  await ensureCourseAccess(courseId, actor);

  const student = await findUserById(studentId);
  if (!student || student.role !== "student") {
    const error = new Error("Student not found.");
    error.statusCode = 404;
    throw error;
  }

  const logs = await listHintInteractionsForStudent({ studentId, courseId });

  return {
    student: {
      id: student.id,
      displayName: student.displayName,
      email: student.email
    },
    logs
  };
}

module.exports = {
  getStudentHintLogs,
  markHintLimitReached,
  requestHint,
  saveMcqAnswers
};
