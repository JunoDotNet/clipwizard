import React from 'react';

const QueueControls = ({
  // Queue data
  cropQueue,
  queueIndex,
  setQueueIndex,
  currentItem,
  
  // Queue source controls
  queueSource,
  setQueueSource,
  clipTabs,
  handleSceneDetection,
  
  // Playback controls
  isPlayingAll,
  playAllClips,
  stopPlayingAll,
  currentPlayingIndex,
  jumpToClip,
  videoRef,
  
  // Copy/Paste functionality
  copiedData,
  sourceClipLabel,
  setCopiedData,
  setSourceClipLabel,
  
  // Data management
  getItemData,
  getSharedData,
  setItemData,
  setCurrentData,
  
  // Sharing functionality
  activeBrokenFromSharing,
  setActiveBrokenFromSharing,
  sharingGroups,
  setSharingGroups,
  
  // Page type for logging
  pageType = 'default'
}) => {
  if (!cropQueue || cropQueue.length === 0) return null;

  return (
    <div style={{ 
      background: '#2a2a2a',
      borderRadius: '8px',
      border: '1px solid #444',
      padding: '12px',
      color: '#fff'
    }}>
      {/* Add CSS for hover effect */}
      <style>{`
        .queue-item:hover .play-button {
          opacity: 1 !important;
          pointer-events: auto !important;
        }
      `}</style>
      
      {/* Header with controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>🎞 Queue ({cropQueue.length})</h4>
          
          {/* Play All button */}
          <button
            style={{
              fontSize: 11,
              padding: '4px 8px',
              background: isPlayingAll ? '#ff6b6b' : '#52c41a',
              color: 'white',
              border: 'none',
              borderRadius: 3,
              cursor: 'pointer'
            }}
            onClick={isPlayingAll ? stopPlayingAll : playAllClips}
            title={isPlayingAll ? "Stop playing all clips" : "Play all clips sequentially"}
          >
            {isPlayingAll ? '⏸️ Stop' : '▶️ Play All'}
          </button>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Source selector - right aligned */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, color: '#ccc' }}>Source:</label>
            <select
              value={queueSource}
              onChange={(e) => setQueueSource(e.target.value)}
              style={{
                fontSize: 11,
                padding: '2px 6px',
                background: '#333',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: 3
              }}
            >
              <option value="allCuts">All Cut Clips</option>
              {clipTabs?.map(tab => (
                <option key={tab.id} value={tab.id}>Only {tab.name}</option>
              ))}
              <option value="fullVideo">Full Video</option>
              <option value="sceneDetect">Scene Detection</option>
            </select>

            {queueSource === 'sceneDetect' && handleSceneDetection && (
              <button
                style={{
                  fontSize: 11,
                  padding: '2px 6px',
                  background: '#4ecdc4',
                  color: 'black',
                  border: 'none',
                  borderRadius: 3,
                  cursor: 'pointer'
                }}
                onClick={handleSceneDetection}
                title="Run scene detection"
              >
                🧠 Detect
              </button>
            )}
          </div>
          
          {/* Show copied data status */}
          {copiedData && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              padding: '4px 8px',
              background: '#e8f8f5',
              border: '1px solid #4ecdc4',
              borderRadius: 4,
              fontSize: 13,
              color: '#000'
            }}>
              <span>📋 Copied from: <strong>{sourceClipLabel}</strong></span>
              <button
                style={{
                  fontSize: 11,
                  padding: '2px 6px',
                  background: '#ff6b6b',
                  color: 'white',
                  border: 'none',
                  borderRadius: 3,
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setCopiedData(null);
                  setSourceClipLabel('');
                  console.log('🗑️ Cleared copied data');
                }}
                title="Clear copied data"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Queue items */}
      <div style={{ 
        maxHeight: '400px',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        {cropQueue.map((item, idx) => (
          <div
            key={item.id}
            style={{
              padding: '6px 10px',
              background: idx === queueIndex ? '#e0f7ff' : '#f4f4f4',
              border: isPlayingAll && idx === currentPlayingIndex 
                ? '3px solid #007acc' 
                : idx === queueIndex 
                  ? '2px solid #007acc' 
                  : '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#000',
              fontSize: '12px'
            }}
            className="queue-item"
            onClick={() => {
              setQueueIndex(idx);
              jumpToClip(item);
            }}
          >
            <span style={{ flex: 1 }}>
              {item.label} ({item.start?.toFixed(1)}s – {item.end?.toFixed(1)}s)
            </span>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Individual play button - only visible on hover */}
              <button
                style={{ 
                  fontSize: 12, 
                  padding: '2px 6px',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: 3,
                  cursor: 'pointer',
                  minWidth: 20,
                  opacity: 0,
                  transition: 'opacity 0.2s ease',
                  pointerEvents: 'none',
                }}
                className="play-button"
                onClick={e => {
                  e.stopPropagation();
                  const video = videoRef?.current;
                  if (video) {
                    const adjustedStart = item.start + (item.startOffset || 0);
                    const adjustedEnd = item.end + (item.endOffset || 0);
                    
                    // Set video time and play
                    video.currentTime = Math.max(0, adjustedStart);
                    video.play();
                    
                    // Set queue index to this clip
                    setQueueIndex(idx);
                    
                    // Stop "play all" mode if active
                    if (isPlayingAll) {
                      stopPlayingAll();
                    }
                    
                    console.log(`▶️ Playing individual clip: ${item.label} (${adjustedStart}s-${adjustedEnd}s)`);
                    
                    // Set up a listener to pause at the end of this clip
                    const handleTimeUpdate = () => {
                      if (video.currentTime >= adjustedEnd) {
                        video.pause();
                        video.removeEventListener('timeupdate', handleTimeUpdate);
                        console.log(`⏸️ Paused at end of ${item.label}`);
                      }
                    };
                    
                    video.addEventListener('timeupdate', handleTimeUpdate);
                  }
                }}
                title={`Play ${item.label}`}
              >
                ▶️
              </button>
              
              {/* Sharing status */}
              <span style={{ color: '#666', fontSize: 13 }}>
                {(() => {
                  // Check if in any sharing group (includes manually broken clips)
                  for (const [groupId, clipIds] of Object.entries(sharingGroups || {})) {
                    if (clipIds.includes(item.id)) {
                      return `SHARING (${clipIds.length})`;
                    }
                  }
                  
                  return 'UNIQUE';
                })()}
              </span>
              
              {/* Break button - show if clip is in a sharing group */}
              {(() => {
                // Check if in any sharing group
                for (const [groupId, clipIds] of Object.entries(sharingGroups || {})) {
                  if (clipIds.includes(item.id)) {
                    return (
                      <button
                        style={{ 
                          fontSize: 11, 
                          padding: '2px 6px',
                          background: '#ff6b6b',
                          color: 'white',
                          border: 'none',
                          borderRadius: 3,
                          cursor: 'pointer'
                        }}
                        onClick={e => {
                          e.stopPropagation();
                          
                          // Remove from sharing group
                          const newGroups = { ...sharingGroups };
                          newGroups[groupId] = newGroups[groupId].filter(id => id !== item.id);
                          if (newGroups[groupId].length <= 1) {
                            // If only 1 or 0 clips left, delete the group
                            delete newGroups[groupId];
                          }
                          setSharingGroups(newGroups);
                          
                          // Mark as broken from sharing
                          const newBroken = new Set([...(activeBrokenFromSharing || []), item.id]);
                          setActiveBrokenFromSharing(newBroken);
                          
                          // Create unique data
                          const itemOverrides = getItemData();
                          const currentData = itemOverrides[item.id] || getSharedData();
                          const newOverrides = {
                            ...itemOverrides,
                            [item.id]: JSON.parse(JSON.stringify(currentData))
                          };
                          setItemData(newOverrides);
                          
                          if (item.id === currentItem?.id) {
                            setCurrentData(JSON.parse(JSON.stringify(currentData)));
                          }
                          
                          console.log(`🔓 Broke ${item.label} from sharing group`);
                        }}
                        title={`Break sharing and create unique ${pageType} data for this clip`}
                      >
                        Break
                      </button>
                    );
                  }
                }
                
                return null;
              })()}
              
              {/* Copy button - always available */}
              <button
                style={{ 
                  fontSize: 11, 
                  padding: '2px 6px',
                  background: '#4ecdc4',
                  color: 'white',
                  border: 'none',
                  borderRadius: 3,
                  cursor: 'pointer',
                  marginLeft: 4
                }}
                onClick={e => {
                  e.stopPropagation();
                  // Copy the current data from this clip
                  const itemOverrides = getItemData();
                  const clipData = itemOverrides[item.id] || getSharedData();
                  setCopiedData(JSON.parse(JSON.stringify(clipData)));
                  setSourceClipLabel(item.label);
                  console.log(`📋 Copied ${pageType} data from ${item.label}`);
                }}
                title={`Copy data from ${item.label}`}
              >
                Copy
              </button>
              
              {/* Paste button - only available if we have copied data */}
              {copiedData && (
                <button
                  style={{ 
                    fontSize: 11, 
                    padding: '2px 6px',
                    background: '#95e1d3',
                    color: 'black',
                    border: 'none',
                    borderRadius: 3,
                    cursor: 'pointer',
                    marginLeft: 4
                  }}
                  onClick={e => {
                    e.stopPropagation();
                    
                    // Find the source clip that has this exact data
                    let sourceClipId = null;
                    let sourceGroupId = null;
                    const itemOverrides = getItemData();
                    
                    // First check if copied data matches any existing data
                    for (const [clipId, override] of Object.entries(itemOverrides)) {
                      if (JSON.stringify(override) === JSON.stringify(copiedData)) {
                        sourceClipId = clipId;
                        break;
                      }
                    }
                    
                    // Find if source is in an existing sharing group
                    if (sourceClipId) {
                      for (const [groupId, clipIds] of Object.entries(sharingGroups || {})) {
                        if (clipIds.includes(sourceClipId)) {
                          sourceGroupId = groupId;
                          break;
                        }
                      }
                    }
                    
                    // Apply the data to this clip
                    const newOverrides = {
                      ...itemOverrides,
                      [item.id]: JSON.parse(JSON.stringify(copiedData))
                    };
                    setItemData(newOverrides);
                    
                    if (sourceGroupId) {
                      // Add to existing sharing group (both source and target if not already there)
                      const newGroups = { ...sharingGroups };
                      if (!newGroups[sourceGroupId].includes(item.id)) {
                        newGroups[sourceGroupId] = [...newGroups[sourceGroupId], item.id];
                      }
                      setSharingGroups(newGroups);
                      console.log(`🔗 Added ${item.label} to existing sharing group (${newGroups[sourceGroupId].length} total)`);
                    } else if (sourceClipId) {
                      // Check if target is already in a group
                      let targetGroupId = null;
                      for (const [groupId, clipIds] of Object.entries(sharingGroups || {})) {
                        if (clipIds.includes(item.id)) {
                          targetGroupId = groupId;
                          break;
                        }
                      }
                      
                      if (targetGroupId) {
                        // Target is in a group, add source to that group
                        const newGroups = { ...sharingGroups };
                        if (!newGroups[targetGroupId].includes(sourceClipId)) {
                          newGroups[targetGroupId] = [...newGroups[targetGroupId], sourceClipId];
                        }
                        setSharingGroups(newGroups);
                        console.log(`🔗 Added source ${sourceClipId} to target's group (${newGroups[targetGroupId].length} total)`);
                      } else {
                        // Create new sharing group
                        let groupNum = 1;
                        const existingGroups = Object.keys(sharingGroups || {});
                        while (existingGroups.includes(`group-${groupNum}`)) {
                          groupNum++;
                        }
                        
                        const groupId = `group-${groupNum}`;
                        const newGroups = {
                          ...sharingGroups,
                          [groupId]: [sourceClipId, item.id]
                        };
                        setSharingGroups(newGroups);
                        console.log(`🔗 Created new sharing group ${groupId} with 2 clips`);
                      }
                    }
                    
                    // Remove target from broken sharing if it was broken
                    const newBroken = new Set([...(activeBrokenFromSharing || [])]);
                    newBroken.delete(item.id);
                    setActiveBrokenFromSharing(newBroken);
                    
                    // Update data if this is the current item
                    if (item.id === currentItem?.id) {
                      setCurrentData(JSON.parse(JSON.stringify(copiedData)));
                    }
                    
                    console.log(`📋 Pasted data to ${item.label}`);
                  }}
                  title={`Paste data from ${sourceClipLabel}`}
                >
                  Paste
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QueueControls;
