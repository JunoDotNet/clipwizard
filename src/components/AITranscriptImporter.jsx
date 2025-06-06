import React from 'react';

const AITranscriptImporter = ({ onImport }) => {
  const handleImport = async () => {
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{ description: 'Text Files', accept: { 'text/plain': ['.txt'] } }],
        multiple: false,
      });

      const file = await fileHandle.getFile();
      const content = await file.text();

      const sections = content.split(/\n(?=Short:)/g); // break on "Short:" headers

      sections.forEach((section, index) => {
        const lines = section.trim().split('\n');

        if (!lines.length || !lines[0].startsWith('Short:')) return;

        const title = lines[0].replace('Short:', '').trim() || `AI Cut ${index + 1}`;
        const clips = lines.slice(1).map((line, i) => {
          const match = line.match(/^\[(\d+)s–(\d+)s\]\s+(.*)/);
          if (!match) return null;
          const [, startStr, endStr, text] = match;
          return {
            id: Date.now() + index * 100 + i,
            start: parseInt(startStr),
            end: parseInt(endStr),
            text,
            startOffset: 0,
            endOffset: 0,
          };
        }).filter(Boolean);

        if (clips.length > 0) {
          onImport(clips, title); // 💡 triggers a new cut tab
        }
      });
    } catch (err) {
      console.error('Failed to import AI transcript:', err);
    }
  };

  return (
    <button onClick={handleImport} style={{ marginTop: 10 }}>
      🔁 Import Multi-Cut Script (.txt)
    </button>
  );
};

export default AITranscriptImporter;
