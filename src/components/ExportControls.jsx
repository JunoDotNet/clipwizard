// src/components/ExportControls.jsx
import React from 'react';
import { Buffer } from 'buffer';
import exportInstructions from '../utils/exportInstructions';



const ExportControls = ({
  selectedFile,
  transcript,
  clipTabs,
  activeTabId,
}) => {
  const activeTab = clipTabs.find(tab => tab.id === activeTabId);
  const activeTabClips = activeTab?.clips || [];

  const handleExport = async () => {
    if (!selectedFile?.originalFile) return alert('❌ No file loaded.');

    const buffer = await selectedFile.originalFile.arrayBuffer();
    const nodeBuffer = Buffer.from(buffer);

    const path = await window.electronAPI.exportClips(
      nodeBuffer,
      selectedFile.name,
      activeTabClips
    );

    if (path) alert(`✅ Exported to:\n${path}`);
  };

  const handleSave = async () => {
    if (!selectedFile) return alert('❌ No file loaded.');

    const project = {
      videoFileName: selectedFile.name,
      videoFilePath: selectedFile.path,
      transcript,
      clipTabs,
      activeTabId,
    };

    const result = await window.electronAPI.saveProject(project);
    if (result) alert(`✅ Project saved to:\n${result}`);
  };

const handleExportRawText = async () => {
  if (!Array.isArray(transcript) || transcript.length === 0) {
    return alert('❌ No transcript to export.');
  }

  const lines = transcript.map((line) => {
    const start = Math.round(line.start);
    const end = Math.round(line.end);
    return `[${start}s–${end}s] ${line.text}`;
  });

  const fullText = `${exportInstructions}\n\nShort: Full Transcript\n${lines.join('\n')}`;

  const blob = new Blob([fullText], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'clipwizard_transcript.txt';
  a.click();
};

  return (
    <div style={{ marginTop: 10 }}>
      <button onClick={handleExport}>🪄 Export Final Video</button>

      <button onClick={handleSave} style={{ marginLeft: 10 }}>
        💾 Save Project
      </button>

      <button onClick={handleExportRawText} style={{ marginLeft: 10 }}>
        📄 Export Editable Transcript
      </button>

    </div>
  );
};

export default ExportControls;
