const { deleteAnomalyFlagBySessionId, upsertAnomalyFlag } = require("../data/anomaly-flag.store");
const { upsertSessionMetric } = require("../data/session-metric.store");
const { getBaselineAggregate, upsertStudentBaseline } = require("../data/student-baseline.store");
const { getTelemetrySessionAnalysisContext, listTelemetryEventsBySessionId } = require("../data/telemetry-session.store");

const inFlightAnalyses = new Map();

function roundNumber(value, precision) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(precision));
}

function average(values, precision = 2) {
  const numericValues = values.filter((value) => Number.isFinite(value));

  if (!numericValues.length) {
    return null;
  }

  const sum = numericValues.reduce((total, value) => total + value, 0);
  return roundNumber(sum / numericValues.length, precision);
}

function isTextProducingKey(keyCode) {
  if (!keyCode) {
    return false;
  }

  if (keyCode.length === 1) {
    return true;
  }

  return /^(Key[A-Z]|Digit\d|Space|Numpad\d|NumpadDecimal|NumpadAdd|NumpadSubtract|NumpadMultiply|NumpadDivide|Minus|Equal|BracketLeft|BracketRight|Backslash|Semicolon|Quote|Comma|Period|Slash|Backquote)$/.test(
    keyCode
  );
}

function isRevisionKey(keyCode) {
  return keyCode === "Backspace" || keyCode === "Delete";
}

function computeZScore(value, mean, stddev) {
  if (![value, mean, stddev].every(Number.isFinite) || stddev <= 0) {
    return null;
  }

  return roundNumber(Math.abs(value - mean) / stddev, 4);
}

function computeConfidence({
  compositeZ,
  zscoreThreshold,
  pasteCharsTotal,
  pasteThresholdChars,
  pasteTriggered
}) {
  let confidence = null;

  if (Number.isFinite(compositeZ) && Number.isFinite(zscoreThreshold) && zscoreThreshold > 0 && compositeZ > zscoreThreshold) {
    const normalized = Math.min(1, (compositeZ - zscoreThreshold) / zscoreThreshold);
    confidence = 50 + 50 * normalized;
  }

  if (pasteTriggered && Number.isFinite(pasteCharsTotal) && Number.isFinite(pasteThresholdChars) && pasteThresholdChars >= 0) {
    const denominator = Math.max(1, pasteThresholdChars);
    const normalized = Math.min(1, (pasteCharsTotal - pasteThresholdChars) / denominator);
    const pasteConfidence = 50 + 50 * normalized;
    confidence = confidence === null ? pasteConfidence : Math.max(confidence, pasteConfidence);
  }

  return roundNumber(confidence, 2);
}

function computeSessionMetrics(events) {
  const dwellValues = [];
  const flightValues = [];
  const keyEvents = [];
  const pasteEvents = [];
  let maxCumulativePasteChars = null;
  let summedPasteChars = 0;
  let blurCount = 0;

  for (const event of events) {
    if (Number.isFinite(event.dwellMs)) {
      dwellValues.push(event.dwellMs);
    }

    if (Number.isFinite(event.flightMs)) {
      flightValues.push(event.flightMs);
    }

    if (event.keyCode || Number.isFinite(event.dwellMs) || Number.isFinite(event.flightMs)) {
      keyEvents.push(event);
    }

    if (Number.isFinite(event.pasteChars) && event.pasteChars > 0) {
      pasteEvents.push(event);
      summedPasteChars += event.pasteChars;
    }

    if (Number.isFinite(event.cumulativePasteChars)) {
      maxCumulativePasteChars = maxCumulativePasteChars === null
        ? event.cumulativePasteChars
        : Math.max(maxCumulativePasteChars, event.cumulativePasteChars);
    }

    if (Number.isFinite(event.blurCountDelta) && event.blurCountDelta > 0) {
      blurCount += event.blurCountDelta;
    } else if (event.eventType === "blur") {
      blurCount += 1;
    }
  }

  const textProducingKeyCount = keyEvents.filter((event) => isTextProducingKey(event.keyCode)).length;
  const revisionKeyCount = keyEvents.filter((event) => isRevisionKey(event.keyCode)).length;
  const totalKeyCount = keyEvents.length;
  const firstTimestamp = events.length ? events[0].timestampMs : null;
  const lastTimestamp = events.length ? events[events.length - 1].timestampMs : null;
  const activeMillis =
    Number.isFinite(firstTimestamp) && Number.isFinite(lastTimestamp) ? Math.max(0, lastTimestamp - firstTimestamp) : 0;
  const activeMinutes = activeMillis > 0 ? activeMillis / 60000 : 0;
  const pasteCharsTotal = maxCumulativePasteChars !== null ? maxCumulativePasteChars : summedPasteChars;

  return {
    avgDwellMs: average(dwellValues, 2),
    avgFlightMs: average(flightValues, 2),
    wpm: activeMinutes > 0 ? roundNumber((textProducingKeyCount / 5) / activeMinutes, 2) : null,
    revisionRate: totalKeyCount > 0 ? roundNumber(revisionKeyCount / totalKeyCount, 4) : null,
    pasteCount: pasteEvents.length,
    pasteCharsTotal,
    blurCount
  };
}

async function analyzeSession(sessionId) {
  const session = await getTelemetrySessionAnalysisContext(sessionId);

  if (!session) {
    throw new Error("Telemetry session not found.");
  }

  const events = await listTelemetryEventsBySessionId(sessionId);
  const metrics = computeSessionMetrics(events);

  await upsertSessionMetric({
    sessionId,
    avgDwellMs: metrics.avgDwellMs,
    avgFlightMs: metrics.avgFlightMs,
    wpm: metrics.wpm,
    revisionRate: metrics.revisionRate,
    pasteCount: metrics.pasteCount,
    pasteCharsTotal: metrics.pasteCharsTotal,
    blurCount: metrics.blurCount
  });

  const priorBaseline = await getBaselineAggregate({
    studentId: session.userId,
    courseId: session.courseId,
    deviceType: session.deviceType,
    excludeSessionId: sessionId
  });
  const updatedBaselineAggregate = await getBaselineAggregate({
    studentId: session.userId,
    courseId: session.courseId,
    deviceType: session.deviceType
  });

  const canRunCompositeDetection = priorBaseline.sessionCount >= 3;
  const wpmZ = computeZScore(metrics.wpm, priorBaseline.meanWpm, priorBaseline.stddevWpm);
  const pasteZ = computeZScore(metrics.pasteCharsTotal, priorBaseline.meanPasteChars, priorBaseline.stddevPasteChars);
  const revisionZ = computeZScore(metrics.revisionRate, priorBaseline.meanRevisionRate, priorBaseline.stddevRevisionRate);
  const compositeZ =
    canRunCompositeDetection && [wpmZ, pasteZ, revisionZ].every(Number.isFinite)
      ? roundNumber(0.4 * wpmZ + 0.35 * pasteZ + 0.25 * revisionZ, 4)
      : null;

  const pasteThreshold = session.pasteThresholdChars;
  const zscoreThreshold = session.zscoreThreshold;
  const pasteTriggered =
    Number.isFinite(metrics.pasteCharsTotal) &&
    Number.isFinite(pasteThreshold) &&
    pasteThreshold >= 0 &&
    metrics.pasteCharsTotal > pasteThreshold;
  const compositeTriggered =
    canRunCompositeDetection &&
    Number.isFinite(compositeZ) &&
    Number.isFinite(zscoreThreshold) &&
    compositeZ > zscoreThreshold;
  const shouldFlag = pasteTriggered || compositeTriggered;

  if (shouldFlag) {
    await upsertAnomalyFlag({
      sessionId,
      studentId: session.userId,
      compositeZ,
      confidencePct: computeConfidence({
        compositeZ,
        zscoreThreshold,
        pasteCharsTotal: metrics.pasteCharsTotal,
        pasteThresholdChars: pasteThreshold,
        pasteTriggered
      }),
      pasteTriggered,
      wpmZ,
      pasteZ,
      revisionZ,
      zscoreThresholdSnapshot: zscoreThreshold,
      pasteThresholdCharsSnapshot: pasteThreshold
    });
  } else {
    await deleteAnomalyFlagBySessionId(sessionId);
  }

  const baseline = await upsertStudentBaseline({
    studentId: session.userId,
    courseId: session.courseId,
    deviceType: session.deviceType,
    meanWpm: updatedBaselineAggregate.meanWpm,
    stddevWpm: updatedBaselineAggregate.stddevWpm,
    meanDwellMs: updatedBaselineAggregate.meanDwellMs,
    stddevDwellMs: updatedBaselineAggregate.stddevDwellMs,
    meanFlightMs: updatedBaselineAggregate.meanFlightMs,
    stddevFlightMs: updatedBaselineAggregate.stddevFlightMs,
    meanRevisionRate: updatedBaselineAggregate.meanRevisionRate,
    stddevRevisionRate: updatedBaselineAggregate.stddevRevisionRate,
    meanPasteChars: updatedBaselineAggregate.meanPasteChars,
    stddevPasteChars: updatedBaselineAggregate.stddevPasteChars,
    sessionCount: updatedBaselineAggregate.sessionCount,
    isCalibrated: updatedBaselineAggregate.sessionCount >= 3
  });

  return {
    sessionId,
    metrics,
    priorBaseline,
    baseline,
    flagTriggered: shouldFlag
  };
}

function runSessionAnalysis(sessionId) {
  const existing = inFlightAnalyses.get(sessionId);

  if (existing) {
    return existing;
  }

  const job = analyzeSession(sessionId).finally(() => {
    inFlightAnalyses.delete(sessionId);
  });

  inFlightAnalyses.set(sessionId, job);
  return job;
}

function enqueueSessionAnalysis(sessionId) {
  const job = runSessionAnalysis(sessionId);
  job.catch((error) => {
    console.error(`Failed to analyze telemetry session ${sessionId}.`, error);
  });
  return job;
}

module.exports = {
  enqueueSessionAnalysis,
  runSessionAnalysis
};
