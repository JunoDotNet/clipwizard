import React, { useRef, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import VideoPlayer from '../components/VideoPlayer';
import CutTabGrid from '../components/CutTabGrid';
import useClipPlayback from '../hooks/useClipPlayback';
import SelectedCutList from '../components/SelectedCutList';
import exportToPremiereXml from '../utils/exportToPremiereXml';

const ExportPage = () => {
  const {
    selectedFile,
    transcript,
    videoSrc,
    clipTabs,
    setClipTabs,
    activeTabId,
  } = useAppContext();

  const [exportTypes, setExportTypes] = useState({
    mp4: true,
    xml: true,
    transcript: false,
  });

  const [selectedTabIds, setSelectedTabIds] = useState(clipTabs.map(t => t.id));
  const [exportPath, setExportPath] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
  const [isExporting, setIsExporting] = useState(false);
  const [cancelRequested, setCancelRequested] = useState(false);
  const [videoResolution, setVideoResolution] = useState({ width: 1920, height: 1080 });
  const videoRef = useRef();
  const { playClips } = useClipPlayback(videoRef);

  const filteredTabs = clipTabs.filter(tab => selectedTabIds.includes(tab.id));

  const toggleTab = (id) => {
    setSelectedTabIds(prev =>
      prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    );
  };

  const updateDescription = (id, newText) => {
    setClipTabs(prev =>
      prev.map(tab =>
        tab.id === id ? { ...tab, description: newText } : tab
      )
    );
  };

  const handlePickFolder = async () => {
    const result = await window.electronAPI.selectExportFolder?.();
    if (result?.filePath || result?.filePaths?.[0]) {
      setExportPath(result.filePath || result.filePaths[0]);
    } else if (typeof result === 'string') {
      setExportPath(result);
    }
  };

  const handleExportAll = async () => {
    if (!exportPath) return alert('❗ Please choose an export folder.');
    if (filteredTabs.length === 0) return alert('❗ No cut tabs selected.');

    const buffer = await window.electronAPI.readVideoBuffer(selectedFile.path || selectedFile);
    setExportProgress({ current: 0, total: filteredTabs.length });
    setIsExporting(true);
    setCancelRequested(false);

    for (let i = 0; i < filteredTabs.length; i++) {
      if (cancelRequested) {
        setExportStatus('❌ Export canceled.');
        break;
      }

      const tab = filteredTabs[i];
      const safeName = tab.name.replace(/\s+/g, '_') || `clip_${i + 1}`;
      setExportStatus(`Exporting ${i + 1} of ${filteredTabs.length}: ${safeName}`);
      setExportProgress(prev => ({ ...prev, current: i }));

      if (exportTypes.mp4) {
        const mp4Path = `${exportPath}/${safeName}.mp4`;
        await window.electronAPI.exportSingleCut(buffer, selectedFile.name, tab.clips, mp4Path);
      }

      if (exportTypes.xml) {
        const xml = exportToPremiereXml(
          tab.clips,
          selectedFile.path || selectedFile,
          safeName,
          videoResolution // use detected resolution
        );
        const xmlPath = `${exportPath}/${safeName}.xml`;
        await window.electronAPI.saveXmlToPath(xmlPath, xml);
      }

      if (exportTypes.transcript) {
        const json = JSON.stringify(tab.clips, null, 2);
        const transcriptPath = `${exportPath}/${safeName}_transcript.json`;
        await window.electronAPI.saveTranscriptFile?.(transcriptPath, json);
      }
    }

    if (!cancelRequested) {
      setExportStatus('✅ Finished!');
      setExportProgress(prev => ({ ...prev, current: prev.total }));
    }

    setIsExporting(false);
  };

  return (
    <div style={{ display: 'flex', padding: 20, gap: 20 }}>
      <div style={{ flex: 1 }}>
        <h2>📤 Export</h2>
        <VideoPlayer src={videoSrc} videoRef={videoRef} onLoadedMetadata={e => {
          setVideoResolution({
            width: e.target.videoWidth,
            height: e.target.videoHeight
          });
        }} />
        <h3 style={{ marginTop: 20 }}>🎞 Select Cuts to Include</h3>
        <CutTabGrid
          tabs={clipTabs}
          selectedIds={selectedTabIds}
          toggleTab={toggleTab}
          updateDescription={updateDescription}
          onPlayTab={(tab) => playClips(tab.clips)}
        />
      </div>

      <div
        style={{
          width: 280,
          flexShrink: 0,
          paddingLeft: 20,
          borderLeft: '1px solid #ccc',
          background: '#f9f9f9',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <SelectedCutList
            tabs={clipTabs}
            selectedIds={selectedTabIds}
            toggleTab={toggleTab}
          />
          {/* Export options at top */}
          <div style={{ marginTop: 20 }}>
            <label style={{ fontWeight: 'bold' }}>📦 What to Export:</label>
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label>
                <input
                  type="checkbox"
                  checked={exportTypes.mp4}
                  onChange={(e) => setExportTypes(prev => ({ ...prev, mp4: e.target.checked }))}
                /> MP4 Clips
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={exportTypes.xml}
                  onChange={(e) => setExportTypes(prev => ({ ...prev, xml: e.target.checked }))}
                /> Premiere XML
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={exportTypes.transcript}
                  onChange={(e) => setExportTypes(prev => ({ ...prev, transcript: e.target.checked }))}
                /> Transcript (.json)
              </label>
            </div>
          </div>
        </div>

        {/* Progress + cancel + export folder at very bottom */}
        <div style={{ marginTop: 20, fontSize: 12, color: '#444' }}>
          {exportProgress.total > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 10,
            }}>
              <button
                onClick={() => setCancelRequested(true)}
                disabled={!isExporting}
                style={{
                  width: 24,
                  height: 24,
                  fontSize: 14,
                  background: '#ff4d4f',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: isExporting ? 'pointer' : 'not-allowed',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✖
              </button>

              <div style={{
                flex: 1,
                height: 8,
                background: '#ddd',
                borderRadius: 4,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${(exportProgress.current / exportProgress.total) * 100}%`,
                  background: '#28a745',
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          )}

          {exportStatus && (
            <div style={{ fontSize: 12, fontStyle: 'italic', color: '#007acc', marginBottom: 10 }}>
              {exportStatus}
            </div>
          )}

          {/* Folder + Export */}
          <label style={{ fontWeight: 'bold' }}>📁 Export Folder:</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <input
              type="text"
              value={exportPath}
              placeholder="Choose folder..."
              readOnly
              style={{ flex: 1, padding: 4, fontSize: 12 }}
            />
            <button onClick={handlePickFolder}>📂</button>
          </div>

          <button
            onClick={handleExportAll}
            disabled={isExporting}
            style={{
              marginTop: 10,
              width: '100%',
              padding: 8,
              background: isExporting ? '#ccc' : '#007acc',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              fontWeight: 'bold',
              cursor: isExporting ? 'not-allowed' : 'pointer',
            }}
          >
            🚀 {isExporting ? 'Exporting…' : 'Export All Selected'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportPage;
