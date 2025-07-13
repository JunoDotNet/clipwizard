// utils/drawWrappedText.js
export function drawWrappedText(ctx, text, box, options = {}) {
  const {
    font = '16px Arial',
    color = 'white',
    lineHeight = 1.2,
    align = 'left',
    padding = 6,
    maxFontSize = 100,
    minFontSize = 4,
    fixedFontSize = null,
  } = options;

  const { x, y, width, height } = box;
  const lines = [];

  // Helper to measure wrapped lines
  const wrapLines = (text, fontSize) => {
    ctx.font = `${fontSize}px Arial`;
    const words = text.split(' ');
    let currentLine = '';
    const wrapped = [];

    for (const word of words) {
      const testLine = currentLine + word + ' ';
      const { width: testWidth } = ctx.measureText(testLine);
      if (testWidth > width - padding * 2 && currentLine) {
        wrapped.push(currentLine);
        currentLine = word + ' ';
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) wrapped.push(currentLine);
    return wrapped;
  };

  let fontSize = fixedFontSize || maxFontSize;
  let wrappedLines = wrapLines(text, fontSize);
  let totalHeight = wrappedLines.length * fontSize * lineHeight;

  if (!fixedFontSize) {
    // Shrink font size until text fits in the box
    while ((totalHeight > height - padding * 2 || wrappedLines.some(line => ctx.measureText(line).width > width - padding * 2)) && fontSize > minFontSize) {
      fontSize -= 1;
      wrappedLines = wrapLines(text, fontSize);
      totalHeight = wrappedLines.length * fontSize * lineHeight;
    }
  }

  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.font = `${fontSize}px Arial`;

  const lineOffsetY = (height - totalHeight) / 2 + padding;
  wrappedLines.forEach((line, index) => {
    const offsetX = align === 'center' ? width / 2 : align === 'right' ? width - padding : padding;
    ctx.fillText(line, x + offsetX, y + lineOffsetY + index * fontSize * lineHeight);
  });
}
