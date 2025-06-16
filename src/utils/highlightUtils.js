export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  const buffer = 0.001;
  return aEnd > bStart + buffer && aStart < bEnd - buffer;
}

export function insertHighlightSection(existingSections, newSection) {
  const { startTime, endTime } = newSection;

  let updated = [];

  for (const sec of existingSections) {
    if (sec.endTime <= startTime || sec.startTime >= endTime) {
      updated.push(sec);
    } else {
      if (sec.startTime < startTime) {
        updated.push({
          ...sec,
          endTime: startTime,
        });
      }
      if (sec.endTime > endTime) {
        updated.push({
          ...sec,
          startTime: endTime,
        });
      }
    }
  }

  // ✅ Now push the entire newSection object, preserving labelId and any other fields
  updated.push(newSection);

  return updated.sort((a, b) => a.startTime - b.startTime);
}
