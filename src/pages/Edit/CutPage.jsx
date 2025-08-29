import React, { useRef, useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import VideoPlayer from '../../components/shared/VideoPlayer';
import ClipTabs from '../../components/cut/ClipTabs';
import AITranscriptImporter from '../../components/cut/AITranscriptImporter';
import useClipPlayback from '../../hooks/useClipPlayback';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import TranscriptDragSource from '../../components/cut/TranscriptDragSource';
import DropZone from '../../components/cut/DropZone';
import { arrayMove } from '@dnd-kit/sortable'; 
import { v4 as uuidv4 } from 'uuid';
import WaveformPlayer from '../../components/shared/WaveformPlayer';

const CutPage = () => {
  const videoRef = useRef();
  const {
    videoSrc,
    transcript,
    clipTabs,
    setClipTabs,
    activeTabId,
    setActiveTabId,
    highlightedSections,
    highlightLabels,
    wavPath,
  } = useAppContext();

  const [selectedClipId, setSelectedClipId] = useState(null);
  const activeTab = clipTabs.find(tab => tab.id === activeTabId);
  const [activeHighlightFilter, setActiveHighlightFilter] = useState(null);
  const [activeDragLine, setActiveDragLine] = useState(null);
  const { playClips } = useClipPlayback(videoRef);
  const [pendingSelection, setPendingSelection] = useState(null);
  const [timeLimit, setTimeLimit] = useState(null);
  const [editingTabId, setEditingTabId] = useState(null);
  const [editingTabName, setEditingTabName] = useState('');
  const [showSectionDropdown, setShowSectionDropdown] = useState(false);

  const handleDeleteClip = (clipId) => {
    updateActiveTabClips(clips => clips.filter(c => c.id !== clipId));
    if (selectedClipId === clipId) setSelectedClipId(null);
  };

  useEffect(() => {
    if (pendingSelection && activeTab?.clips.some(c => c.id === pendingSelection || c.originalId === pendingSelection)) {
      setSelectedClipId(pendingSelection);
      setPendingSelection(null);
    }
  }, [activeTab?.clips, pendingSelection]);

  const handleSelectClip = (clip) => {
    setPendingSelection(clip.id || clip.originalId);
    const actualStart = clip.start + (clip.startOffset || 0);
    if (videoRef.current) {
      videoRef.current.currentTime = actualStart;
      videoRef.current.play();
    }
  };

  const selectedClip = activeTab?.clips.find(
    c => c.id === selectedClipId || c.originalId === selectedClipId
  );

  const updateActiveTabClips = (updater) => {
    setClipTabs(prev =>
      prev.map(tab =>
        tab.id === activeTabId ? { ...tab, clips: updater(tab.clips) } : tab
      )
    );
  };

  const filteredTranscript = activeHighlightFilter
    ? transcript.filter(line =>
        highlightedSections.some(h =>
          h.labelId === activeHighlightFilter &&
          line.start >= h.startTime &&
          line.end <= h.endTime
        )
      ).map(line => {
        const highlight = highlightedSections.find(h =>
          h.labelId === activeHighlightFilter &&
          line.start >= h.startTime &&
          line.end <= h.endTime
        );
        return highlight ? { ...line, __highlightColor: highlight.color } : line;
      })
    : transcript.map(line => {
        const highlight = highlightedSections.find(h =>
          line.start >= h.startTime && line.end <= h.endTime
        );
        return highlight ? { ...line, __highlightColor: highlight.color } : line;
      });

  const handleDrop = ({ active, over }) => {
    if (!over?.id) return;

    const draggedLine = active.data.current?.line;

    if (over.id === 'cut-drop-zone' && draggedLine) {
      const newClip = {
        ...draggedLine,
        id: `${draggedLine.id}-cut-${uuidv4()}`,
        originalId: draggedLine.id,
        startOffset: 0,
        endOffset: 0,
      };

      updateActiveTabClips((clips) => {
        const alreadyExists = clips.some(c => c.id === draggedLine.id || c.originalId === draggedLine.id);
        return alreadyExists ? clips : [...clips, newClip];
      });
      return;
    }

    updateActiveTabClips((clips) => {
      const oldIndex = clips.findIndex(c => c.id === active.id);
      const newIndex = clips.findIndex(c => c.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return clips;
      return arrayMove(clips, oldIndex, newIndex);
    });
  };

  const renameTab = (tabId, newName) => {
    if (newName && newName.trim()) {
      setClipTabs(tabs => tabs.map(t => 
        t.id === tabId ? { ...t, name: newName.trim() } : t
      ));
    }
  };

  const updateClipOffset = (clipId, key, delta) => {
    updateActiveTabClips(clips =>
      clips.map(clip =>
        clip.id === clipId
          ? { ...clip, [key]: +(clip[key] || 0) + delta }
          : clip
      )
    );
  };

  const importAIClipSet = (clipArray, tabName = `AI Cut ${clipTabs.length + 1}`) => {
    const newId = `tab-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const matched = clipArray.map((clip, index) => {
      const match = transcript.find(t =>
        Math.round(t.start) === Math.round(clip.start) &&
        Math.round(t.end) === Math.round(clip.end) &&
        t.text.trim() === clip.text.trim()
      );

      const baseClip = match
        ? { ...match, startOffset: 0, endOffset: 0 }
        : {
            id: `ai-${Date.now()}-${index}`,
            start: clip.start,
            end: clip.end,
            text: clip.text,
            startOffset: 0,
            endOffset: 0,
          };

      const matchedHighlight = highlightedSections.find(h =>
        baseClip.start >= h.startTime && baseClip.end <= h.endTime
      );

      if (matchedHighlight) {
        baseClip.__highlightColor = matchedHighlight.color;
      }

      return baseClip;
    });

    setClipTabs(prev => [...prev, { id: newId, name: tabName, clips: matched }]);
    setActiveTabId(newId);
  };

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
      }}>✂️ Cut Page</h2>

      <DndContext
        onDragStart={({ active }) => setActiveDragLine(active?.data?.current?.line || null)}
        onDragEnd={(event) => {
          handleDrop(event);
          setActiveDragLine(null);
        }}
        onDragCancel={() => setActiveDragLine(null)}
      >
        <DragOverlay zIndex={9999}>
          {activeDragLine && (
            <TranscriptDragSource line={activeDragLine} isOverlay />
          )}
        </DragOverlay>

        {/* FIRST ROW: Transcript (with sections) + DropZone + Cut Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: `var(--scaled-spacing-sm, 8px)`, 
          flex: 1,
          minHeight: 0,
          marginBottom: `var(--scaled-spacing-lg, 20px)`
        }}>
          {/* LEFT: Transcript with Section Dropdown */}
          <div style={{ 
            flex: 1, 
            minHeight: 0,
            overflow: 'visible'
          }}>
            {/* Transcript */}
            <div style={{ 
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              border: `var(--scaled-border-width, 1px) solid #333`,
              borderRadius: `var(--scaled-border-radius, 4px)`,
              overflow: 'hidden'
            }}>
              <div style={{ 
                margin: 0,
                padding: `var(--scaled-spacing-sm, 8px) var(--scaled-spacing-base, 12px)`,
                fontSize: `var(--scaled-font-base, 14px)`,
                color: '#ddd',
                background: '#2a2a2a',
                borderBottom: `var(--scaled-border-width, 1px) solid #333`,
                position: 'sticky', 
                top: 0, 
                zIndex: 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>🎙 Transcript</span>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowSectionDropdown(!showSectionDropdown)}
                    style={{
                      background: '#444',
                      border: `var(--scaled-border-width, 1px) solid #555`,
                      color: '#ddd',
                      padding: `var(--scaled-spacing-xs, 4px) var(--scaled-spacing-sm, 8px)`,
                      fontSize: `var(--scaled-font-sm, 12px)`,
                      borderRadius: `var(--scaled-border-radius, 4px)`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: `var(--scaled-spacing-xs, 4px)`
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {activeHighlightFilter !== null && (
                        <div style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '2px',
                          backgroundColor: highlightLabels.find(l => l.id === activeHighlightFilter)?.color || '#666',
                          flexShrink: 0
                        }}></div>
                      )}
                      <span>
                        {activeHighlightFilter === null ? 'All Sections' : 
                         highlightLabels.find(l => l.id === activeHighlightFilter)?.name || 'Section'}
                      </span>
                    </div>
                    <span style={{ fontSize: '10px' }}>{showSectionDropdown ? '▲' : '▼'}</span>
                  </button>
                  {showSectionDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      background: '#2a2a2a',
                      border: `var(--scaled-border-width, 1px) solid #555`,
                      borderRadius: `var(--scaled-border-radius, 4px)`,
                      zIndex: 2000,
                      minWidth: '180px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
                    }}>
                      <button 
                        onClick={() => {
                          setActiveHighlightFilter(null);
                          setShowSectionDropdown(false);
                        }}
                        style={{ 
                          width: '100%',
                          padding: `var(--scaled-spacing-xs, 6px) var(--scaled-spacing-sm, 8px)`,
                          fontSize: `var(--scaled-font-sm, 12px)`,
                          background: activeHighlightFilter === null ? '#0066cc' : 'transparent',
                          border: 'none',
                          color: '#ddd',
                          cursor: 'pointer',
                          textAlign: 'left',
                          borderRadius: `var(--scaled-border-radius, 4px)`,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <div style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '2px',
                          backgroundColor: 'transparent',
                          border: '1px solid #666',
                          flexShrink: 0
                        }}></div>
                        All Sections
                      </button>
                      {highlightLabels.map(label => (
                        <button
                          key={label.id}
                          onClick={() => {
                            setActiveHighlightFilter(label.id);
                            setShowSectionDropdown(false);
                          }}
                          style={{
                            width: '100%',
                            padding: `var(--scaled-spacing-xs, 6px) var(--scaled-spacing-sm, 8px)`,
                            fontSize: `var(--scaled-font-sm, 12px)`,
                            background: activeHighlightFilter === label.id ? label.color : 'transparent',
                            border: 'none',
                            color: activeHighlightFilter === label.id ? '#000' : '#ddd',
                            cursor: 'pointer',
                            textAlign: 'left',
                            borderRadius: `var(--scaled-border-radius, 4px)`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <div style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '2px',
                            backgroundColor: label.color,
                            flexShrink: 0
                          }}></div>
                          {label.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ 
                flex: 1,
                overflowY: 'auto',
                padding: `var(--scaled-spacing-sm, 8px)`
              }}>
                {filteredTranscript.map(line => (
                  <TranscriptDragSource
                    key={line.id}
                    line={line}
                    alreadyAddedIds={activeTab?.clips.map(c => c.originalId) || []}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* MIDDLE: DropZone */}
          <div style={{ 
            flex: 1, 
            minHeight: 0,
            overflow: 'hidden'
          }}>
            <DropZone
              clips={activeTab?.clips || []}
              playClips={playClips}
              onSelectClip={handleSelectClip}
              selectedClipId={selectedClipId}
              onDeleteClip={handleDeleteClip}
              tabName={activeTab?.name}
              timeLimit={timeLimit}
              setTimeLimit={setTimeLimit}
              onRenameTab={(newName) => renameTab(activeTab?.id, newName)}
            />
          </div>

          {/* RIGHT: Cut Tabs */}
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: `var(--scaled-spacing-xs, 2px)`,
            flexShrink: 0,
            alignSelf: 'flex-start' // Align with top of the row
          }}>
            {/* Individual Tab Buttons */}
            {clipTabs.map((tab, index) => (
              <div key={tab.id} style={{ position: 'relative' }}>
                {editingTabId === tab.id ? (
                  // Edit mode - vertical input
                  <div style={{
                    width: `calc(24px * var(--app-scale, 1))`,
                    height: `calc(60px * var(--app-scale, 1))`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#333',
                    border: `var(--scaled-border-width, 2px) solid #0066cc`,
                    borderRadius: `var(--scaled-border-radius, 3px)`,
                    padding: `var(--scaled-spacing-xs, 2px)`
                  }}>
                    <input
                      type="text"
                      value={editingTabName}
                      onChange={(e) => setEditingTabName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (editingTabName.trim()) {
                            setClipTabs(tabs => tabs.map(t => 
                              t.id === tab.id ? { ...t, name: editingTabName.trim() } : t
                            ));
                          }
                          setEditingTabId(null);
                          setEditingTabName('');
                        } else if (e.key === 'Escape') {
                          setEditingTabId(null);
                          setEditingTabName('');
                        }
                      }}
                      onBlur={() => {
                        if (editingTabName.trim()) {
                          setClipTabs(tabs => tabs.map(t => 
                            t.id === tab.id ? { ...t, name: editingTabName.trim() } : t
                          ));
                        }
                        setEditingTabId(null);
                        setEditingTabName('');
                      }}
                      autoFocus
                      style={{
                        width: '18px',
                        height: '50px',
                        padding: '2px',
                        fontSize: `var(--scaled-font-xs, 8px)`,
                        background: '#444',
                        border: '1px solid #555',
                        color: '#ddd',
                        borderRadius: '2px',
                        outline: 'none',
                        textAlign: 'center',
                        writingMode: 'vertical-rl',
                        textOrientation: 'mixed',
                        transform: 'rotate(180deg)'
                      }}
                    />
                  </div>
                ) : (
                  // Normal tab button
                  <button
                    onClick={() => setActiveTabId(tab.id)}
                    onDoubleClick={() => {
                      setEditingTabId(tab.id);
                      setEditingTabName(tab.name);
                    }}
                    style={{
                      width: `calc(24px * var(--app-scale, 1))`,
                      height: `calc(60px * var(--app-scale, 1))`,
                      background: activeTabId === tab.id ? '#0066cc' : '#444',
                      border: `var(--scaled-border-width, 1px) solid #555`,
                      borderRadius: `var(--scaled-border-radius, 3px)`,
                      color: '#ddd',
                      fontSize: `var(--scaled-font-xs, 9px)`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      writingMode: 'vertical-rl',
                      textOrientation: 'mixed',
                      padding: `var(--scaled-spacing-xs, 2px)`,
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      transition: 'background-color 0.2s ease'
                    }}
                    title={`${tab.name} (double-click to rename)`}
                  >
                    <span style={{
                      transform: 'rotate(180deg)',
                      fontSize: `var(--scaled-font-xs, 9px)`,
                      lineHeight: 1,
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {tab.name.length > 8 ? tab.name.substring(0, 8) + '...' : tab.name}
                    </span>
                  </button>
                )}
              </div>
            ))}
            
            {/* Add New Tab Button */}
            <button
              onClick={() => {
                const id = `tab-${Date.now()}`;
                setClipTabs(tabs => [...tabs, { id, name: `Cut ${tabs.length + 1}`, clips: [] }]);
                setActiveTabId(id);
              }}
              style={{
                width: `calc(24px * var(--app-scale, 1))`,
                height: `calc(40px * var(--app-scale, 1))`,
                background: '#666',
                border: `var(--scaled-border-width, 1px) solid #555`,
                borderRadius: `var(--scaled-border-radius, 3px)`,
                color: '#ddd',
                fontSize: `var(--scaled-font-xs, 9px)`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                transition: 'background-color 0.2s ease'
              }}
              title="Add New Cut Tab"
            >
              <span style={{
                transform: 'rotate(180deg)',
                fontSize: `var(--scaled-font-xs, 8px)`
              }}>
                +
              </span>
            </button>

            {/* Delete button - Show only for active tab when there are multiple tabs */}
            {clipTabs.length > 1 && activeTab && (
              <button
                onClick={() => {
                  if (confirm(`Delete "${activeTab.name}" tab?`)) {
                    setClipTabs(prev => {
                      const filtered = prev.filter(tab => tab.id !== activeTabId);
                      if (filtered.length) {
                        setActiveTabId(filtered[0].id);
                      }
                      return filtered;
                    });
                  }
                }}
                style={{
                  width: `calc(24px * var(--app-scale, 1))`,
                  height: `calc(20px * var(--app-scale, 1))`,
                  background: '#663333',
                  border: `var(--scaled-border-width, 1px) solid #666`,
                  borderRadius: `var(--scaled-border-radius, 2px)`,
                  color: '#ddd',
                  fontSize: `var(--scaled-font-xs, 8px)`,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: `var(--scaled-spacing-xs, 2px)`
                }}
                title="Delete Tab"
              >
                🗑️
              </button>
            )}
          </div>
        </div>

        {/* SECOND ROW: Waveform + Video */}
        <div style={{ 
          display: 'flex', 
          gap: `var(--scaled-spacing-lg, 20px)`, 
          flexShrink: 0,
          alignItems: 'flex-start',
          minHeight: `calc(120px * var(--app-scale, 1))`, // Give it a stable minimum height
        }}>
          {/* LEFT: Waveform Player */}
          <div style={{ 
            flex: 1,
            minWidth: 0, // Prevent flex item from overflowing
            contain: 'layout style', // Optimize rendering performance
          }}>
            <WaveformPlayer
              clips={activeTab?.clips && activeTab.clips.length > 0 ? activeTab.clips : transcript}
              videoRef={videoRef}
              updateClipOffset={updateClipOffset}
              selectedClip={selectedClip}
              editable={true}
              title="🎛️ Fine-Tune Clip (Waveform)"
            />
          </div>

          {/* RIGHT: Video Player */}
          <div style={{ 
            flexShrink: 0,
            width: `calc(600px * var(--app-scale, 1))`, // Fixed width to prevent layout shifts
            maxWidth: '100%'
          }}>
            {videoSrc ? (
              <VideoPlayer src={videoSrc} videoRef={videoRef} />
            ) : (
              <div style={{ 
                padding: `var(--scaled-spacing-lg, 20px)`,
                fontSize: `var(--scaled-font-base, 14px)`,
                color: '#999',
                textAlign: 'center',
                border: `var(--scaled-border-width, 1px) dashed #555`,
                borderRadius: `var(--scaled-border-radius, 4px)`
              }}>
                ⚠️ No video loaded.
              </div>
            )}
          </div>
        </div>
      </DndContext>

      <AITranscriptImporter onImport={importAIClipSet} />
    </div>
  );
};

export default CutPage;
