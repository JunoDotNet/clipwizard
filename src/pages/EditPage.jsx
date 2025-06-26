import React, { useRef, useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import VideoPlayer from '../components/VideoPlayer';
import ClipTabs from '../components/ClipTabs';
import AITranscriptImporter from '../components/AITranscriptImporter';
import useClipPlayback from '../hooks/useClipPlayback';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import TranscriptDragSource from '../components/TranscriptDragSource';
import DropZone from '../components/DropZone';
import { arrayMove } from '@dnd-kit/sortable'; 
import { v4 as uuidv4 } from 'uuid';
import ClipEditor from '../components/ClipEditor';
import ClipWaveformEditor from '../components/ClipWaveFormEditor';

const EditPage = () => {
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
  } = useAppContext();

  const [selectedClipId, setSelectedClipId] = useState(null);
  const activeTab = clipTabs.find(tab => tab.id === activeTabId);
  const [activeHighlightFilter, setActiveHighlightFilter] = useState(null);
  const [activeDragLine, setActiveDragLine] = useState(null);
  const { playClips } = useClipPlayback(videoRef);
  const [pendingSelection, setPendingSelection] = useState(null);

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
    <>
      <h2>✂️ Edit Clips</h2>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
        <div style={{ flex: '0 0 60%' }}>
          <VideoPlayer src={videoSrc} videoRef={videoRef} />
        </div>
        <div style={{ flex: '0 0 40%' }}>
          <ClipWaveformEditor
            clip={selectedClip}
            updateClipOffset={updateClipOffset}
          />
        </div>
      </div>

      <DndContext
        onDragStart={({ active }) => setActiveDragLine(active?.data?.current?.line || null)}
        onDragEnd={(event) => {
          handleDrop(event);
          setActiveDragLine(null);
        }}
        onDragCancel={() => setActiveDragLine(null)}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
          <DragOverlay zIndex={9999}>
            {activeDragLine && (
              <TranscriptDragSource line={activeDragLine} isOverlay />
            )}
          </DragOverlay>

          <div style={{ width: 180, flexShrink: 0 }}>
            <h4>🗂 Show Section</h4>
            <button onClick={() => setActiveHighlightFilter(null)} style={{ marginBottom: 6 }}>
              Show Full Transcript
            </button>
            {highlightLabels.map(label => (
              <button
                key={label.id}
                onClick={() => setActiveHighlightFilter(label.id)}
                style={{
                  display: 'block',
                  marginBottom: 4,
                  backgroundColor: activeHighlightFilter === label.id ? label.color : '#eee',
                  border: '1px solid #ccc',
                  padding: '4px 6px',
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                {label.name}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flex: 1, gap: 20 }}>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <h4>🎙 Transcript</h4>
              {filteredTranscript.map(line => (
                <TranscriptDragSource
                  key={line.id}
                  line={line}
                  alreadyAddedIds={activeTab?.clips.map(c => c.originalId || c.id) || []}
                />
              ))}
            </div>

            <div style={{ flex: 1, overflow: 'hidden' }}>
              <DropZone
                clips={activeTab?.clips || []}
                playClips={playClips}
                onSelectClip={handleSelectClip}
                selectedClipId={selectedClipId}
                onDeleteClip={handleDeleteClip}
              />
            </div>
          </div>

          <div style={{ width: 180, flexShrink: 0 }}>
            <ClipTabs
              tabs={clipTabs}
              activeTabId={activeTabId}
              setActiveTabId={setActiveTabId}
              addTab={() => {
                const id = `tab-${Date.now()}`;
                setClipTabs(tabs => [...tabs, { id, name: `Cut ${tabs.length + 1}`, clips: [] }]);
                setActiveTabId(id);
              }}
              renameTab={(id, name) =>
                setClipTabs(tabs => tabs.map(t => t.id === id ? { ...t, name } : t))
              }
              deleteTab={(id) => {
                setClipTabs(prev => {
                  const filtered = prev.filter(tab => tab.id !== id);
                  if (id === activeTabId && filtered.length) {
                    setActiveTabId(filtered[0].id);
                  }
                  return filtered;
                });
              }}
            />
          </div>
        </div>
      </DndContext>

      <AITranscriptImporter onImport={importAIClipSet} />
    </>
  );
};

export default EditPage;
