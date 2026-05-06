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
const { ensureCourseAccess } = require("./course.service");
const { requestSocraticHint } = require("./openai-tutor.service");

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
  if (user.role !== "student") {
    const error = new Error("Only students can request tutor hints.");
    error.statusCode = 403;
    throw error;
  }

  if (!message || !message.trim()) {
    const error = new Error("message is required.");
    error.statusCode = 400;
    throw error;
  }

  const context = await resolveTutorContext({ assignmentId, courseId });
  const assignment = context.assignment;
  const resolvedCourseId = context.courseId;

  if (assignment && assignment.assignmentType !== "qa") {
    const error = new Error("Socratic Tutor is only available for Q&A assignments.");
    error.statusCode = 409;
    throw error;
  }

  const enrollment = await findEnrollment(resolvedCourseId, user.id);
  if (!enrollment) {
    const error = new Error("You are not enrolled in this course.");
    error.statusCode = 403;
    throw error;
  }

  const session = await getOrCreateActiveStudySession({
    courseId: resolvedCourseId,
    studentId: user.id,
    assignmentId: assignmentId || null
  });

  const maxHintLevel = getMaxHintLevel(assignment);
  const effectiveWordsTyped = countWords(message);
  const latestInteraction = await getLatestHintInteractionForStudySession(session.id);
  const jailbreakDetected = detectJailbreak(message);

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
  if (user.role !== "student") {
    const error = new Error("Only students can close their tutor session.");
    error.statusCode = 403;
    throw error;
  }

  const context = await resolveTutorContext({ assignmentId, courseId });

  const closedSessions = await closeActiveStudySession({
    courseId: context.courseId,
    studentId: user.id,
    assignmentId: assignmentId || null
  });

  return { closedSessions };
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
  requestHint
};
