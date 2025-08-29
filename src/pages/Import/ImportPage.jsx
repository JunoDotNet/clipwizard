import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import VideoPlayer from '../../components/shared/VideoPlayer';
import useTranscription from '../../hooks/useTranscription';
import TranscriptList from './TranscriptList';
import { insertHighlightSection } from '../../utils/highlightUtils';
import HighlightLabelManager from './HighlightLabelManager';
import WaveformPlayer from '../../components/shared/WaveformPlayer';
import AddCustomClip from './AddCustomClip';
import SplashScreen from '../../components/SplashScreen';
import { v4 as uuidv4 } from 'uuid';

const ImportPage = () => {
  const {
    setVideoSrc, setTranscript, setClipTabs, setSelectedFile, setActiveTabId,
    videoSrc, transcript, highlightedSections, setHighlightedSections, highlightLabels, setHighlightLabels,
    showSplash, setShowSplash, // <-- use from context
    clearCropData, // Add clearCropData function
  } = useAppContext();

  const { transcribe, transcription } = useTranscription();
  const videoRef = useRef();
  const [markingStartId, setMarkingStartId] = useState(null);
  const [activeLabelId, setActiveLabelId] = useState(null);
  const [audioArray, setAudioArray] = useState(null); // New state for audio data
  const [audioDuration, setAudioDuration] = useState(null);
  const [wavUrl, setWavUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCustomClipDropdown, setShowCustomClipDropdown] = useState(false);
  const [showAddLabelDropdown, setShowAddLabelDropdown] = useState(false);
  const [labelName, setLabelName] = useState('');
  const [labelColor, setLabelColor] = useState('#ffcc00');

  const presetColors = [
    '#FF6633', '#FFB399', '#FF33FF', '#FFFF99',
    '#00B3E6', '#E6B333', '#3366E6', '#999966',
    '#99FF99', '#B34D4D', '#80B300', '#809900',
  ];

  const handleFileSelected = (url, file, model = 'ggml-base.en.bin') => {
    setVideoSrc(url);
    setSelectedFile(file);
    setLoading(true);
    transcribe(file, model);
    clearCropData(); // Clear crop data when loading a new video
    // setShowSplash(false); // Moved to after transcript loads
  };

  const getLabelColor = (id) =>
    highlightLabels.find(label => label.id === id)?.color || '#ffcc00';

  const handleAddLabel = () => {
    if (!labelName.trim()) return;
    
    const colorInUse = highlightLabels.some(label => label.color === labelColor);
    if (colorInUse) {
      alert('❌ That color is already used. Pick a different one.');
      return;
    }

    const newLabel = {
      id: uuidv4(),
      name: labelName.trim(),
      color: labelColor,
    };

    setHighlightLabels(prev => [...prev, newLabel]);
    setLabelName('');
    setLabelColor('#ffcc00');
    setShowAddLabelDropdown(false);
  };

  useEffect(() => {
    if (transcription) {
      console.log('🎯 Raw transcription data:', transcription);
      
      const parse = t => {
        if (!t || typeof t !== 'string') return 0;
        const parts = t.replace(',', '.').split(':');
        return parts.length === 3 ? (+parts[0]) * 3600 + (+parts[1]) * 60 + (+parts[2]) : 0;
      };

      // First, parse all segments with start and end from timestamps
      const raw = (transcription.transcription || []).map((seg, i) => {
        console.log(`🔍 Processing segment ${i}:`, seg);
        console.log(`🔍 timestamps object:`, seg.timestamps);
        console.log(`🔍 offsets object:`, seg.offsets);
        
        // Use timestamps object properties instead of from/to
        const startTime = seg.timestamps?.from ? parse(seg.timestamps.from) : 
                         (typeof seg.offsets?.from === 'number' ? seg.offsets.from / 1000 : 0);
        const endTime = seg.timestamps?.to ? parse(seg.timestamps.to) : 
                       (typeof seg.offsets?.to === 'number' ? seg.offsets.to / 1000 : startTime + 3);
        
        console.log(`⏰ Times for segment ${i}: start=${startTime}, end=${endTime}`);
        
        return {
          ...seg,
          id: i,
          start: startTime,
          end: endTime,
        };
      });

      console.log('✅ Final processed transcript:', raw);
      setTranscript(raw);
      setLoading(false);
      setShowSplash(false); // Hide splash when transcript is ready
    }
  }, [transcription, setTranscript, setShowSplash, setLoading]);

  const jumpTo = (time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleMark = (id) => {
    if (!activeLabelId) return;
    if (markingStartId === null) {
      setMarkingStartId(id);
    } else {
      const startId = Math.min(markingStartId, id);
      const endId = Math.max(markingStartId, id);
      const startTime = transcript[startId]?.start || 0;
      const endTime = transcript[endId]?.end || startTime + 1;

      const newSection = {
        startTime: startTime,
        endTime: endTime,
        color: getLabelColor(activeLabelId),
        labelId: activeLabelId,
      };

      setHighlightedSections(prev =>
        insertHighlightSection(prev, newSection)
      );
      console.log("🔥 Highlight added:", newSection);
      setMarkingStartId(null);
      setActiveLabelId(null); // exit highlight mode
    }
  };

  // Compute transcriptWithEnds so each segment has a start and end
  const transcriptWithEnds = useMemo(() => {
    return Array.isArray(transcript)
      ? transcript.map((seg, i, arr) => ({
          ...seg,
          end: (typeof seg.end === 'number' && seg.end > seg.start)
            ? seg.end
            : (arr[i + 1] ? arr[i + 1].start : (audioDuration || (arr[i] ? arr[i].start + 3 : 0))),
        }))
      : [];
  }, [transcript, audioDuration]);

  // Handler to hide splash when a project is loaded from ProjectControls
  const handleProjectLoaded = () => {
    setShowSplash(false);
    setLoading(false);
  };

  const { splashMode } = useAppContext();

  return (
    <div style={{ 
      padding: `var(--scaled-spacing-lg, 20px)`, 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      <h2 style={{ 
        margin: `0 0 var(--scaled-spacing-lg, 20px) 0`, 
        flexShrink: 0,
        fontSize: `var(--scaled-font-xl, 18px)`,
        color: '#ddd'
      }}>📥 Import Project</h2>

      {videoSrc ? (
        <div style={{ 
          display: 'flex', 
          gap: `var(--scaled-spacing-lg, 20px)`, 
          flex: 1,
          minHeight: 0,
          overflow: 'hidden'
        }}>
          {/* LEFT COLUMN: Video, Waveform, Labels, Custom Clips */}
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column',
            gap: `var(--scaled-spacing-lg, 20px)`,
            minWidth: 0,
            overflow: 'visible',
            maxHeight: '100%'
          }}>
            {/* Video Player */}
            <div style={{ flexShrink: 0 }}>
              <VideoPlayer src={videoSrc} videoRef={videoRef} />
            </div>

            {/* Waveform Player */}
            {transcript.length > 0 && (
              <div style={{ flexShrink: 0 }}>
                <WaveformPlayer
                  clips={transcriptWithEnds}
                  videoRef={videoRef}
                  onAudioDuration={setAudioDuration}
                />
              </div>
            )}

            {/* Highlight Labels */}
            {transcript.length > 0 && (
              <div style={{ 
                flex: '0 1 200px', // Allow shrinking but limit growth to 200px
                display: 'flex',
                flexDirection: 'column',
                overflow: 'visible',
                minHeight: 0,
                maxHeight: `calc(200px * var(--app-scale, 1))`
              }}>
                {/* Title and Add Button - Outside scrollable area */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: `var(--scaled-spacing-sm, 8px)`,
                  flexShrink: 0,
                  position: 'relative'
                }}>
                  <h4 style={{ 
                    margin: 0,
                    fontSize: `var(--scaled-font-base, 14px)`,
                    color: '#ddd'
                  }}>
                    🎨 Highlight Labels
                  </h4>
                  <div style={{ position: 'relative' }}>
                    <button 
                      ref={(el) => {
                        if (el && showAddLabelDropdown) {
                          const rect = el.getBoundingClientRect();
                          el.dataset.buttonTop = rect.top;
                          el.dataset.buttonRight = rect.right;
                        }
                      }}
                      onClick={() => setShowAddLabelDropdown(!showAddLabelDropdown)}
                      style={{
                        padding: `var(--scaled-spacing-xs, 4px) var(--scaled-spacing-sm, 6px)`,
                        fontSize: `var(--scaled-font-sm, 12px)`,
                        background: '#444',
                        border: `var(--scaled-border-width, 1px) solid #555`,
                        color: '#ddd',
                        borderRadius: `var(--scaled-border-radius, 4px)`,
                        cursor: 'pointer',
                        height: `calc(24px * var(--app-scale, 1))`,
                      }}
                    >
                      ➕ Add Label
                    </button>
                    {showAddLabelDropdown && (
                      <div style={{
                        position: 'absolute',
                        bottom: '100%',
                        right: 0,
                        marginBottom: `var(--scaled-spacing-xs, 4px)`,
                        background: '#333',
                        border: `var(--scaled-border-width, 1px) solid #555`,
                        borderRadius: `var(--scaled-border-radius, 4px)`,
                        padding: `var(--scaled-spacing-base, 12px)`,
                        zIndex: 1000,
                        minWidth: '250px',
                        maxHeight: '300px',
                        overflow: 'visible',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                      }}>
                        <div style={{ marginBottom: `var(--scaled-spacing-sm, 8px)` }}>
                          <label style={{ 
                            display: 'block', 
                            marginBottom: `var(--scaled-spacing-xs, 4px)`,
                            fontSize: `var(--scaled-font-sm, 12px)`,
                            color: '#ddd'
                          }}>
                            Label Name:
                          </label>
                          <input
                            type="text"
                            value={labelName}
                            onChange={(e) => setLabelName(e.target.value)}
                            placeholder="Enter label name"
                            style={{
                              width: '100%',
                              padding: `var(--scaled-spacing-xs, 4px)`,
                              fontSize: `var(--scaled-font-sm, 12px)`,
                              background: '#444',
                              border: `var(--scaled-border-width, 1px) solid #555`,
                              color: '#ddd',
                              borderRadius: `var(--scaled-border-radius, 4px)`,
                            }}
                          />
                        </div>
                        
                        <div style={{ marginBottom: `var(--scaled-spacing-sm, 8px)` }}>
                          <label style={{ 
                            display: 'block', 
                            marginBottom: `var(--scaled-spacing-xs, 4px)`,
                            fontSize: `var(--scaled-font-sm, 12px)`,
                            color: '#ddd'
                          }}>
                            Color:
                          </label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: `var(--scaled-spacing-xs, 4px)`, marginBottom: `var(--scaled-spacing-xs, 4px)` }}>
                            {presetColors.map(color => {
                              const isUsed = highlightLabels.some(label => label.color === color);
                              return (
                                <button
                                  key={color}
                                  onClick={() => !isUsed && setLabelColor(color)}
                                  style={{
                                    width: `calc(20px * var(--app-scale, 1))`,
                                    height: `calc(20px * var(--app-scale, 1))`,
                                    backgroundColor: color,
                                    border: labelColor === color ? '2px solid white' : '1px solid #555',
                                    opacity: isUsed ? 0.4 : 1,
                                    cursor: isUsed ? 'not-allowed' : 'pointer',
                                    borderRadius: `var(--scaled-border-radius, 3px)`
                                  }}
                                  disabled={isUsed}
                                  title={isUsed ? 'Color already in use' : color}
                                />
                              );
                            })}
                          </div>
                          <input
                            type="color"
                            value={labelColor}
                            onChange={(e) => setLabelColor(e.target.value)}
                            style={{
                              width: '100%',
                              height: `calc(30px * var(--app-scale, 1))`,
                              background: '#444',
                              border: `var(--scaled-border-width, 1px) solid #555`,
                              borderRadius: `var(--scaled-border-radius, 4px)`,
                            }}
                          />
                        </div>
                        
                        <div style={{ display: 'flex', gap: `var(--scaled-spacing-xs, 4px)` }}>
                          <button
                            onClick={handleAddLabel}
                            disabled={!labelName.trim()}
                            style={{
                              flex: 1,
                              padding: `var(--scaled-spacing-xs, 4px)`,
                              fontSize: `var(--scaled-font-sm, 12px)`,
                              background: labelName.trim() ? '#0066cc' : '#555',
                              border: `var(--scaled-border-width, 1px) solid #555`,
                              color: '#ddd',
                              borderRadius: `var(--scaled-border-radius, 4px)`,
                              cursor: labelName.trim() ? 'pointer' : 'not-allowed',
                            }}
                          >
                            ✅ Add Label
                          </button>
                          <button
                            onClick={() => {
                              setShowAddLabelDropdown(false);
                              setLabelName('');
                              setLabelColor('#ffcc00');
                            }}
                            style={{
                              padding: `var(--scaled-spacing-xs, 4px)`,
                              fontSize: `var(--scaled-font-sm, 12px)`,
                              background: '#666',
                              border: `var(--scaled-border-width, 1px) solid #555`,
                              color: '#ddd',
                              borderRadius: `var(--scaled-border-radius, 4px)`,
                              cursor: 'pointer',
                            }}
                          >
                            ❌
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Scrollable Labels Container */}
                <div style={{ 
                  overflow: 'auto',
                  flex: 1,
                  border: `var(--scaled-border-width, 1px) solid #333`,
                  borderRadius: `var(--scaled-border-radius, 4px)`,
                  padding: `var(--scaled-spacing-base, 12px)`
                }}>
                  <HighlightLabelManager 
                    setActiveLabelId={setActiveLabelId} 
                    hideTitle={true} 
                    hideAddButton={true}
                  />
                  <div style={{ 
                    marginTop: `var(--scaled-spacing-base, 10px)`, 
                    fontSize: `var(--scaled-font-base, 14px)`,
                    color: '#ddd'
                  }}>
                    {activeLabelId && markingStartId === null && (
                      <>
                        🖊️ Highlight mode: <strong>{highlightLabels.find(l => l.id === activeLabelId)?.name}</strong><br />
                        Click a transcript line to start the highlight.
                        <br />
                        <button 
                          onClick={() => setActiveLabelId(null)} 
                          style={{ 
                            marginTop: `var(--scaled-spacing-xs, 6px)`,
                            padding: `var(--scaled-spacing-xs, 4px) var(--scaled-spacing-sm, 8px)`,
                            fontSize: `var(--scaled-font-sm, 12px)`,
                            background: '#666',
                            border: `var(--scaled-border-width, 1px) solid #555`,
                            color: '#ddd',
                            borderRadius: `var(--scaled-border-radius, 4px)`,
                            cursor: 'pointer'
                          }}
                        >
                          ❌ Cancel Highlight Mode
                        </button>
                      </>
                    )}

                    {markingStartId !== null && (
                      <>
                        Highlight started at line <strong>{markingStartId}</strong>.<br />
                        Now click the end line to confirm.
                        <br />
                        <button 
                          onClick={() => setMarkingStartId(null)} 
                          style={{ 
                            marginTop: `var(--scaled-spacing-xs, 6px)`,
                            padding: `var(--scaled-spacing-xs, 4px) var(--scaled-spacing-sm, 8px)`,
                            fontSize: `var(--scaled-font-sm, 12px)`,
                            background: '#666',
                            border: `var(--scaled-border-width, 1px) solid #555`,
                            color: '#ddd',
                            borderRadius: `var(--scaled-border-radius, 4px)`,
                            cursor: 'pointer'
                          }}
                        >
                          ❌ Cancel Highlight
                        </button>
                      </>
                    )}

                    {!activeLabelId && markingStartId === null && (
                      'Click "Use" on a label to begin highlighting.'
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Transcript */}
          {transcript.length > 0 && (
            <div style={{ 
              width: `calc(400px * var(--app-scale, 1))`,
              display: 'flex', 
              flexDirection: 'column',
              minWidth: 0,
              flexShrink: 0,
              border: `var(--scaled-border-width, 1px) solid #333`,
              borderRadius: `var(--scaled-border-radius, 4px)`,
              padding: `var(--scaled-spacing-base, 12px)`,
              boxSizing: 'border-box',
              overflow: 'hidden'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                margin: `0 0 var(--scaled-spacing-base, 12px) 0`,
              }}>
                <h3 style={{ 
                  margin: 0,
                  fontSize: `var(--scaled-font-lg, 16px)`,
                  color: '#ddd'
                }}>
                  📝 Transcript
                </h3>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowCustomClipDropdown(!showCustomClipDropdown)}
                    style={{
                      padding: `var(--scaled-spacing-xs, 4px) var(--scaled-spacing-sm, 8px)`,
                      fontSize: `var(--scaled-font-sm, 12px)`,
                      background: '#444',
                      border: `var(--scaled-border-width, 1px) solid #555`,
                      color: '#ddd',
                      borderRadius: `var(--scaled-border-radius, 4px)`,
                      cursor: 'pointer',
                      height: `calc(24px * var(--app-scale, 1))`,
                    }}
                  >
                    ➕ Add Custom
                  </button>
                  {showCustomClipDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: `var(--scaled-spacing-xs, 4px)`,
                      background: '#333',
                      border: `var(--scaled-border-width, 1px) solid #555`,
                      borderRadius: `var(--scaled-border-radius, 4px)`,
                      padding: `var(--scaled-spacing-base, 12px)`,
                      zIndex: 1000,
                      minWidth: '250px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}>
                      <AddCustomClip
                        onAddClip={(newLine) => {
                          setTranscript((prev) => [...prev, newLine].sort((a, b) => a.start - b.start));
                          setShowCustomClipDropdown(false);
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div style={{ 
                flex: 1, 
                overflow: 'auto',
                maxHeight: '100%',
                pointerEvents: 'auto',
              }}>
                <TranscriptList
                  transcript={transcript}
                  selectedIds={[]}
                  toggleId={null}
                  jumpTo={jumpTo}
                  onClickLine={handleMark}
                  highlightedSections={highlightedSections}
                  activeLabelId={activeLabelId}
                />
              </div>
            </div>
          )}
        </div>
      ) : null}

      {showSplash && (
        <SplashScreen
          onFileSelected={handleFileSelected}
          loading={loading}
          setTranscript={setTranscript}
          setClipTabs={setClipTabs}
          setActiveTabId={setActiveTabId}
          setSelectedFile={setSelectedFile}
          setVideoSrc={setVideoSrc}
          setWavUrl={setWavUrl}
          onProjectLoaded={handleProjectLoaded}
          splashMode={splashMode}
        />
      )}
    </div>
  );
};

export default ImportPage;
