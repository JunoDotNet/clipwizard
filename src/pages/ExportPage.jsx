import React, { useRef, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import OutputCanvas from '../components/shared/OutputCanvas';
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
    cropOverrides,
    captionOverrides,
    getOutputResolution
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
  const [previewTabId, setPreviewTabId] = useState(null); // Track which tab to preview
  const videoRef = useRef();
  const { playClips } = useClipPlayback(videoRef);

  const filteredTabs = clipTabs.filter(tab => selectedTabIds.includes(tab.id));
  
  // Get the tab to preview (first selected tab or active tab)
  const previewTab = clipTabs.find(tab => tab.id === (previewTabId || activeTabId)) || filteredTabs[0];

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
        
        // Get crop and caption data for this tab's clips
        const enrichedClips = tab.clips.map((clip, index) => {
          const clipId = `${tab.id}-clip-${index}`;
          const captionLayers = captionOverrides[clipId] || [];
          
          // Convert caption layers array to single caption object for backend
          // Backend expects: { text, fontSize, fontFamily, fontColor, customFontPath, textAlign }
          let captionData = {};
          if (Array.isArray(captionLayers) && captionLayers.length > 0) {
            // Use the first visible caption layer
            const activeLayer = captionLayers.find(layer => !layer.hidden) || captionLayers[0];
            if (activeLayer && (clip.text || activeLayer.text)) {
              // Extract custom font information from fontFamily if it starts with "Custom_"
              let customFontName = activeLayer.customFontName;
              let customFontPath = activeLayer.customFontPath;
              
              // If fontFamily is "Custom_X", extract the font name
              if (activeLayer.fontFamily && activeLayer.fontFamily.startsWith('Custom_')) {
                const extractedFontName = activeLayer.fontFamily.replace('Custom_', '');
                console.log('🎨 Detected custom font in export:', { 
                  originalFontFamily: activeLayer.fontFamily, 
                  extractedName: extractedFontName,
                  hasCustomFontName: !!customFontName,
                  hasCustomFontPath: !!customFontPath
                });
                
                // Use extracted name if we don't have explicit customFontName
                if (!customFontName) {
                  customFontName = extractedFontName;
                }
              }
              
              // Map UI layer properties to backend expected format
              captionData = {
                text: clip.text || activeLayer.text || '',
                // Use layer's bounding box for auto-sizing calculation
                box: activeLayer.box || { width: 400, height: 100 }, // fallback box size
                fontFamily: activeLayer.fontFamily || 'Arial',
                customFontName: customFontName, // For custom fonts - now properly extracted
                color: activeLayer.color || '#ffffff', // UI uses 'color', backend expects 'fontColor'
                fontColor: activeLayer.color || '#ffffff', // Backend compatibility
                textAlign: activeLayer.textAlign || 'left', // Match CaptionLayerPanel default
                customFontPath: customFontPath, // For custom font files
                // Calculate fontSize based on box dimensions (similar to auto-sizing in UI)
                fontSize: Math.max(16, Math.min(72, Math.floor(activeLayer.box?.height * 0.3) || 24))
              };
            }
          }
          
          // Debug: Log what we're sending for captions
          if (captionData.text && captionData.text.trim()) {
            console.log(`📝 Export caption data for ${clipId}:`, JSON.stringify(captionData, null, 2));
          }
          
          return {
            ...clip,
            cropData: cropOverrides[clipId] || [],
            captionData: captionData
          };
        });
        
        // Debug: Log the enriched clips structure
        console.log('🚀 Exporting enriched clips:', JSON.stringify(enrichedClips, null, 2));
        
        // Try new export function with effects, fallback to basic export
        try {
          if (window.electronAPI.exportSingleCutWithEffects) {
            await window.electronAPI.exportSingleCutWithEffects(
              buffer, 
              selectedFile.name, 
              enrichedClips, 
              mp4Path, 
              getOutputResolution()
            );
          } else {
            // Fallback to basic export without effects
            await window.electronAPI.exportSingleCut(buffer, selectedFile.name, tab.clips, mp4Path);
          }
        } catch (err) {
          console.warn('Advanced export failed, falling back to basic export:', err);
          await window.electronAPI.exportSingleCut(buffer, selectedFile.name, tab.clips, mp4Path);
        }
      }

      if (exportTypes.xml) {
        const xml = exportToPremiereXml(
          tab.clips,
          selectedFile.path || selectedFile,
          safeName,
          getOutputResolution() // use selected output resolution
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
        <h2>📤 Export Preview</h2>
        
        {/* Output Preview Canvas */}
        {previewTab && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                Preview:
              </h3>
              <select
                value={previewTabId || (previewTab ? previewTab.id : '')}
                onChange={(e) => setPreviewTabId(e.target.value)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  fontSize: '12px'
                }}
              >
                {clipTabs.map(tab => (
                  <option key={tab.id} value={tab.id}>
                    {tab.name} ({tab.clips.length} clip{tab.clips.length !== 1 ? 's' : ''})
                  </option>
                ))}
              </select>
              <span style={{ fontSize: '12px', color: '#888' }}>
                (First clip shown)
              </span>
            </div>
            <OutputCanvas
              videoRef={videoRef}
              displaySize={{ width: 400, height: 300 }} // This will be dynamically calculated by OutputCanvas
              videoSize={videoResolution}
              cropLayers={(() => {
                // Get crop data for the first clip in the preview tab
                const firstClip = previewTab.clips[0];
                if (!firstClip) return [];
                const clipId = `${previewTab.id}-clip-0`;
                return cropOverrides[clipId] || [];
              })()}
              captionLayers={(() => {
                // Get caption data for the first clip in the preview tab
                const firstClip = previewTab.clips[0];
                if (!firstClip) return [];
                const clipId = `${previewTab.id}-clip-0`;
                return captionOverrides[clipId] || [];
              })()}
              activeCrop={null}
              enableCaptionEditing={false}
              showResolutionSelector={false}
            />
            
            {/* Hidden video element for the canvas to reference */}
            <video
              ref={videoRef}
              src={videoSrc}
              style={{ display: 'none' }}
              onLoadedMetadata={e => {
                setVideoResolution({
                  width: e.target.videoWidth,
                  height: e.target.videoHeight
                });
              }}
            />
          </div>
        )}
        
        <h3 style={{ marginTop: 20 }}>🎞 Select Cuts to Include</h3>
        <CutTabGrid
          tabs={clipTabs}
          selectedIds={selectedTabIds}
          toggleTab={toggleTab}
          updateDescription={updateDescription}
          onPlayTab={(tab) => {
            setPreviewTabId(tab.id); // Update preview when a tab is played
            playClips(tab.clips);
          }}
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
                /> MP4 Clips {/* Show if crops/captions will be applied */}
                {(() => {
                  // Check if any selected tabs have crop or caption data
                  const hasEffects = filteredTabs.some(tab => 
                    tab.clips.some((clip, index) => {
                      const clipId = `${tab.id}-clip-${index}`;
                      const hasCrop = cropOverrides[clipId] && cropOverrides[clipId].length > 0;
                      const captionLayers = captionOverrides[clipId] || [];
                      
                      // Check if there's any caption text (clip text or layer text)
                      const hasCaption = Array.isArray(captionLayers) && captionLayers.length > 0 && 
                                       captionLayers.some(layer => (clip.text || layer.text || '').trim());
                      
                      // Debug: Log caption detection
                      if (captionLayers.length > 0) {
                        console.log(`📊 Caption detection for ${clipId}:`, {
                          layers: captionLayers,
                          clipText: clip.text,
                          hasCaption
                        });
                      }
                      
                      return hasCrop || hasCaption;
                    })
                  );
                  
                  const hasAspectRatioChange = filteredTabs.some(tab => 
                    tab.clips.some((clip, index) => {
                      const clipId = `${tab.id}-clip-${index}`;
                      return cropOverrides[clipId] && cropOverrides[clipId].length > 0;
                    })
                  );
                  
                  if (hasAspectRatioChange) {
                    return <span style={{ color: '#007acc', fontSize: 11 }}> (vertical {videoResolution.height}x{videoResolution.width})</span>;
                  } else if (hasEffects) {
                    return <span style={{ color: '#007acc', fontSize: 11 }}> (with captions)</span>;
                  }
                  return null;
                })()}
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
