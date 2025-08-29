import React, { useEffect, useRef, useState, useMemo } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/plugins/regions';
import TimelinePlugin from 'wavesurfer.js/plugins/timeline';
import { useAppContext } from '../../context/AppContext';

const formatTime = (seconds) =>
  [seconds / 60, seconds % 60]
    .map((v) => `0${Math.floor(v)}`.slice(-2))
    .join(':');

const WaveformPlayer = ({ 
  clips, 
  updateClipOffset, 
  selectedClip, 
  videoRef,
  editable = false, // New prop to control if regions are editable
  title = "🎛️ Waveform Player" // Customizable title
}) => {
  const { wavPath, highlightLabels, highlightedSections } = useAppContext();
  const containerRef = useRef(null);
  const timelineContainerRef = useRef(null);
  const wavesurferRef = useRef(null);
  const timelinePluginRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioLoaded, setAudioLoaded] = useState(false);

  // Memoize highlight dependency to avoid unnecessary refreshes
  const highlightDependency = useMemo(() => {
    return JSON.stringify(highlightedSections);
  }, [highlightedSections]);

  useEffect(() => {
    console.log('WaveformPlayer clips:', clips);
    setAudioLoaded(false);
    if (!clips?.length || !wavPath || !containerRef.current || !timelineContainerRef.current) {
      console.log('WaveformPlayer: Missing required elements or data');
      return;
    }

    let restoreTime = 0;
    const prevWS = wavesurferRef.current;
    if (prevWS) {
      restoreTime = prevWS.getCurrentTime?.() || 0;
      prevWS.destroy();
    }

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#a0c4ff',
      progressColor: '#3a86ff',
      cursorColor: '#000',
      height: Math.round(80 * (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-scale')) || 1)),
      minPxPerSec: 100, // initial zoom, do not use zoomLevel here
    });

    const regions = ws.registerPlugin(RegionsPlugin.create());
    const timeline = TimelinePlugin.create({
      container: timelineContainerRef.current,
      height: 20,
      timeInterval: 1,
      primaryLabelInterval: 5,
      secondaryLabelInterval: 1,
    });
    timelinePluginRef.current = ws.registerPlugin(timeline);
    wavesurferRef.current = ws;

    // Force timeline update on scroll (useful for editable mode)
    const scrollEl = containerRef.current;
    const handleScroll = () => {
      timelinePluginRef.current?.updateCanvas?.();
    };
    scrollEl?.addEventListener('scroll', handleScroll);

    // Load audio from wavPath (from AppContext) using electronAPI to get a Blob URL
    window.electronAPI.readFileAsBlob(wavPath).then((arrayBuffer) => {
      const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
      const blobUrl = URL.createObjectURL(blob);
      ws.load(blobUrl);
    }).catch(error => {
      console.error('Error loading audio:', error);
    });

    ws.on('decode', () => {
      ws.isReady = true; 
      setAudioLoaded(true);
      
      // Restore time if available
      if (restoreTime) {
        ws.once('redraw', () => {
          ws.setTime(Math.min(restoreTime, ws.getDuration() - 0.1));
        });
      }
      
      // Get duration and adjust timeline intervals based on audio length
      const duration = ws.getDuration();
      
      // Dynamically adjust timeline intervals based on duration
      let timeInterval, primaryLabelInterval;
      if (duration > 3600) { // > 1 hour
        timeInterval = 60; // 1 minute intervals
        primaryLabelInterval = 300; // 5 minute primary labels
      } else if (duration > 1800) { // > 30 minutes
        timeInterval = 30; // 30 second intervals
        primaryLabelInterval = 120; // 2 minute primary labels
      } else if (duration > 600) { // > 10 minutes
        timeInterval = 15; // 15 second intervals
        primaryLabelInterval = 60; // 1 minute primary labels
      } else if (duration > 300) { // > 5 minutes
        timeInterval = 10; // 10 second intervals
        primaryLabelInterval = 30; // 30 second primary labels
      } else {
        timeInterval = 5; // 5 second intervals
        primaryLabelInterval = 15; // 15 second primary labels
      }
      
      // Update timeline with new intervals
      if (timelinePluginRef.current) {
        timelinePluginRef.current.destroy();
      }
      
      const newTimeline = TimelinePlugin.create({
        container: timelineContainerRef.current,
        height: 20,
        timeInterval: timeInterval,
        primaryLabelInterval: primaryLabelInterval,
        secondaryLabelInterval: timeInterval,
      });
      timelinePluginRef.current = ws.registerPlugin(newTimeline);
      
      // Remove any existing regions
      regions.getRegions().forEach(r => r.remove());
      
      // Add regions for each transcript segment (clip)
      if (clips && Array.isArray(clips)) {
        clips.forEach((clip, idx) => {
          if (typeof clip.start !== 'number' || typeof clip.end !== 'number' || clip.start >= clip.end) {
            console.warn(`Skipping invalid clip at idx ${idx}:`, clip);
            return;
          }

          // Calculate start and end times (with offsets for editable mode)
          const startTime = editable ? clip.start + (clip.startOffset || 0) : clip.start;
          const endTime = editable ? clip.end + (clip.endOffset || 0) : clip.end;
          
          // Determine region color
          let regionColor = 'rgba(200,200,200,0.5)'; // base color: light grey
          
          if (editable && clip.__highlightColor) {
            // Use highlight color from clip if in editable mode
            regionColor = clip.__highlightColor + '55';
          } else if (!editable && Array.isArray(highlightedSections)) {
            // Use highlighted sections if in read-only mode
            const match = highlightedSections.find(h =>
              h.startTime <= clip.start && h.endTime >= clip.end
            );
            if (match && match.color) {
              regionColor = match.color + '55';
            }
          }

          const region = regions.addRegion({
            id: `clip-${clip.id ?? idx}`,
            start: startTime,
            end: endTime,
            color: regionColor,
            drag: editable, // Only draggable in editable mode
            resize: editable, // Only resizable in editable mode
          });

          // Add update handler for editable mode
          if (editable) {
            region.on('update-end', () => {
              const newStartOffset = region.start - clip.start;
              const newEndOffset = region.end - clip.end;
              updateClipOffset?.(clip.id, 'startOffset', newStartOffset - (clip.startOffset || 0));
              updateClipOffset?.(clip.id, 'endOffset', newEndOffset - (clip.endOffset || 0));
            });
          }
        });
        console.log('WaveformPlayer: regions created:', clips.length);
      }
      
      // Auto-zoom to fit content
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const autoZoom = containerWidth / duration;
        try {
          if (ws.isReady) {
            ws.zoom(autoZoom);
            setZoomLevel(autoZoom);
            timelinePluginRef.current?.updateCanvas?.();
          } else {
            console.warn('⏳ Skipping autoZoom — audio not ready yet');
          }
        } catch (error) {
          console.error('Error during auto-zoom:', error);
        }
      }
    });

    // Video sync logic
    if (videoRef?.current) {
        const video = videoRef.current;

        const syncFromVideo = () => {
            if (!ws.isPlaying()) {
            ws.setTime(video.currentTime);
            }
        };

        const syncToVideo = () => {
            if (ws.isPlaying()) {
            video.currentTime = ws.getCurrentTime();
            }
            setCurrentTime(ws.getCurrentTime());
        };

        video.addEventListener('timeupdate', syncFromVideo);
        ws.on('timeupdate', syncToVideo);

        // also track time in case videoRef is the master
        const trackVideoTime = () => {
            if (!ws.isPlaying()) {
            setCurrentTime(video.currentTime);
            }
        };
        video.addEventListener('timeupdate', trackVideoTime);

        return () => {
            video.removeEventListener('timeupdate', syncFromVideo);
            video.removeEventListener('timeupdate', trackVideoTime);
            ws.un('timeupdate', syncToVideo);
            scrollEl?.removeEventListener('scroll', handleScroll);
        };
    }

    ws.on('timeupdate', () => {
      setCurrentTime(ws.getCurrentTime());
    });

    return () => {
      if (ws && typeof ws.destroy === 'function') {
        ws.destroy();
      }
      scrollEl?.removeEventListener('scroll', handleScroll);
    };
  }, [clips, wavPath, editable, highlightDependency]);

  // Add a new effect to update zoom only when zoomLevel changes and audio is loaded
  useEffect(() => {
    if (audioLoaded && wavesurferRef.current && wavesurferRef.current.isReady) {
      try {
        wavesurferRef.current.zoom(zoomLevel);
        timelinePluginRef.current?.updateCanvas?.();
      } catch (error) {
        console.error('Error during zoom in effect:', error);
      }
    }
  }, [zoomLevel, audioLoaded]);

  // Auto-pause at end of selected clip (for editable mode)
  useEffect(() => {
    if (!editable || !selectedClip || !videoRef?.current) return;
    const video = videoRef.current;

    const handleTimeUpdate = () => {
      const end = selectedClip.end + (selectedClip.endOffset || 0);
      if (video.currentTime >= end) {
        video.pause();
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [editable, selectedClip, videoRef]);

  // Additional video sync for editable mode
  useEffect(() => {
    if (!editable) return;
    
    const video = videoRef?.current || document.querySelector('video');
    const interval = setInterval(() => {
      if (video && !video.paused && wavesurferRef.current) {
        wavesurferRef.current.setTime(video.currentTime);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [editable, videoRef]);

  const changeZoom = (delta) => {
    if (!audioLoaded || !wavesurferRef.current) {
      console.log('Cannot zoom: audio not loaded or wavesurfer not initialized');
      return;
    }
    try {
      const next = Math.max(0.1, Math.min(1000, zoomLevel + delta));
      setZoomLevel(next);
      wavesurferRef.current.zoom(next);
      timelinePluginRef.current?.updateCanvas?.();
    } catch (error) {
      console.error('Error during zoom:', error);
    }
  };

  if (!clips?.length) return null;

  return (
    <div style={{ 
      padding: 10, 
      overflow: 'hidden',
      height: 'auto'
    }}>
      <h4 style={{ margin: '0 0 10px 0' }}>{title}</h4>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: `calc(80px * var(--app-scale, 1))`,
          marginBottom: 0,
          border: `var(--scaled-border-width, 1px) solid #ccc`,
          background: '#f6f6f6',
          overflowX: 'auto',
          overflowY: 'hidden',
          whiteSpace: 'nowrap',
        }}
      />
      <div ref={timelineContainerRef} style={{ height: `calc(20px * var(--app-scale, 1))`, marginBottom: `var(--scaled-spacing-xs, 4px)` }} />
      <div style={{ 
        display: 'flex', 
        gap: `var(--scaled-spacing-xs, 4px)`, 
        alignItems: 'center',
        fontSize: `var(--scaled-font-sm, 12px)`
      }}>
        <button 
          onClick={() => changeZoom(-20)} 
          disabled={!audioLoaded || !wavesurferRef.current}
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
          ➖
        </button>
        <button 
          onClick={() => changeZoom(20)} 
          disabled={!audioLoaded || !wavesurferRef.current}
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
          ➕
        </button>
        <span>Zoom: {Math.round(zoomLevel)}px/s</span>
        <span>🕒 {formatTime(currentTime)}</span>
        {!audioLoaded && <span style={{ color: '#666' }}>Loading audio...</span>}
        {editable && <span style={{ color: '#666', marginLeft: 10 }}>✏️ Drag regions to adjust timing</span>}
      </div>
    </div>
  );
};

export default WaveformPlayer;