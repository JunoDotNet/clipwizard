import React from 'react';
import { Buffer } from 'buffer';
import exportInstructions from '../utils/exportInstructions';
import exportToPremiereXml from '../utils/exportToPremiereXml';

const ExportControls = ({
  selectedFile,
  transcript,
  clipTabs,
}) => {
  const handleExport = async () => {
    if (!selectedFile?.originalFile) return alert('❌ No file loaded.');
    if (!clipTabs.length) return alert('❌ No selected tabs to export.');

    const buffer = await selectedFile.originalFile.arrayBuffer();
    const nodeBuffer = Buffer.from(buffer);

    for (const tab of clipTabs) {
      if (!tab.clips?.length) continue;

      const defaultFileName = `${tab.name || 'Cut'}.mp4`;

      const { canceled, filePath } = await window.electronAPI.showSaveDialog({
        title: `Save "${tab.name}" Video`,
        defaultPath: defaultFileName,
        filters: [{ name: 'Video', extensions: ['mp4'] }]
      });

      if (canceled || !filePath) continue;

      try {
        await window.electronAPI.exportSingleCut(
          nodeBuffer,
          selectedFile.name,
          tab.clips,
          filePath
        );
        alert(`✅ Exported "${tab.name}" to:\n${filePath}`);
      } catch (err) {
        console.error(`❌ Export failed for "${tab.name}":`, err);
        alert(`❌ Failed to export "${tab.name}"`);
      }
    }
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

  const handleExportPremiereXml = async () => {
    if (!selectedFile?.path || !clipTabs.length) {
      return alert('❌ No file or clips to export.');
    }

    const resolution = await window.electronAPI.getVideoResolution(selectedFile.path) || { width: 1920, height: 1080 };

    for (const tab of clipTabs) {
      if (!tab.clips?.length) continue;

      const xml = exportToPremiereXml(
        tab.clips,
        selectedFile.path,
        tab.name || selectedFile.name.replace(/\.[^/.]+$/, ''),
        resolution
      );

      const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${tab.name || 'Cut'}.xml`;
      a.click();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
      <button onClick={handleExport}>🪄 Export Final Video</button>
      <button onClick={handleExportRawText}>📄 Export Editable Transcript</button>
      <button onClick={handleExportPremiereXml}>🎬 Export Premiere XML (Selected Tabs)</button>
    </div>
  );
};

export default ExportControls;
