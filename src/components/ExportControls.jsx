// src/components/ExportControls.jsx
import React from 'react';
import { Buffer } from 'buffer';
import exportInstructions from '../utils/exportInstructions';
import { exportAllTabsAsXml } from '../utils/exportAllTabsToXml';
import exportToPremiereXml from '../utils/exportToPremiereXml';
import { saveAs } from 'file-saver';



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

const handleExportPremiereXml = async () => {
  if (!selectedFile?.path || !Array.isArray(activeTabClips) || activeTabClips.length === 0) {
    return alert('❌ Missing file or clips to export.');
  }

  const cutName = activeTab?.name || selectedFile.name.replace(/\.[^/.]+$/, '');
  const resolution = await window.electronAPI.getVideoResolution(selectedFile.path) || { width: 1920, height: 1080 };
  console.log('🧠 XML Export - Video Path:', selectedFile.path);
  console.log('🧠 XML Export - Cut Name:', cutName);
  console.log('🧠 XML Export - Video Resolution:', resolution);
 
  const xml = exportToPremiereXml(
    activeTabClips,
    selectedFile.path,
    cutName,
    resolution
  );

  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${cutName}.xml`;
  a.click();
};





const handleExportAllXml = async () => {
  if (!selectedFile?.path) return alert('❌ No file loaded.');
  const resolution = await window.electronAPI.getVideoResolution(selectedFile.path) || { width: 1920, height: 1080 };
  console.log('📦 Export All Tabs - Video Resolution:', resolution);
  await exportAllTabsAsXml(clipTabs, selectedFile.path, resolution);
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

      <button onClick={handleExportPremiereXml} style={{ marginLeft: 10 }}>
        🎬 Export Premiere XML
      </button>

      <button onClick={handleExportAllXml} style={{ marginLeft: 10 }}>
        🧩 Export All Tabs as XML
      </button>


    </div>
  );
};

export default ExportControls;
