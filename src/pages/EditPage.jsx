import React, { useRef, useState } from 'react';
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

  const activeTab = clipTabs.find(tab => tab.id === activeTabId);
  const [activeHighlightFilter, setActiveHighlightFilter] = useState(null);
  const [activeDragLine, setActiveDragLine] = useState(null);
  const { playClips } = useClipPlayback(videoRef);

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

    // First, if dragging from transcript into cut zone
    if (over.id === 'cut-drop-zone' && draggedLine) {
      updateActiveTabClips((clips) => {
        const alreadyExists = clips.some(c => c.id === draggedLine.id);
        return alreadyExists
          ? clips
          : [...clips, {
              ...draggedLine,
              id: `${draggedLine.id}-cut-${uuidv4()}`,
              originalId: draggedLine.id,
              startOffset: 0,
              endOffset: 0,
            }];
      });
      return;
    }

    // Then, try reordering existing clips
    updateActiveTabClips((clips) => {
      const oldIndex = clips.findIndex(c => c.id === active.id);
      const newIndex = clips.findIndex(c => c.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return clips;
      return arrayMove(clips, oldIndex, newIndex);
    });
  };



  const importAIClipSet = (clipArray, tabName = `AI Cut ${clipTabs.length + 1}`) => {
    const newId = `tab-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const matched = clipArray.map((clip) => {
      const match = transcript.find(t =>
        Math.round(t.start) === Math.round(clip.start) &&
        Math.round(t.end) === Math.round(clip.end) &&
        t.text.trim() === clip.text.trim()
      );
      return match ? { ...match, startOffset: 0, endOffset: 0 } : null;
    }).filter(Boolean);

    setClipTabs(tabs => [...tabs, {
      id,
      name: `Cut ${tabs.length + 1}`,
      clips: [],
      description: '',
    }]);
    setActiveTabId(newId);
  };


  return (
    <>
  <h2>✂️ Edit Clips</h2>
  <VideoPlayer src={videoSrc} videoRef={videoRef} />

 <DndContext
    onDragStart={({ active }) => {
      setActiveDragLine(active?.data?.current?.line || null);
    }}
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
            
      {/* Left Sidebar: Show Section */}
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

      {/* Main Column: Transcript + Your Cut */}
      <div style={{ display: 'flex', flex: 1, gap: 20 }}>
        
        {/* Transcript */}
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

        {/* Your Cut */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <DropZone clips={activeTab?.clips || []} playClips={playClips} />
        </div>

      </div>

      {/* Right Sidebar: Cut Tabs */}
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
