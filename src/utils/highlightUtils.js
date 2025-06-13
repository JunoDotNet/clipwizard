// src/utils/highlightUtils.js

export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aEnd > bStart && aStart < bEnd;
}

export function insertHighlightSection(existingSections, newSection) {
  const { startTime, endTime } = newSection;

  const filtered = existingSections.filter(
    sec => !rangesOverlap(sec.startTime, sec.endTime, startTime, endTime)
  );

  return [...filtered, newSection];
}
