import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/plugins/regions';
import TimelinePlugin from 'wavesurfer.js/plugins/timeline';
import { useAppContext } from '../context/AppContext';

const formatTime = (seconds) =>
  [seconds / 60, seconds % 60]
    .map((v) => `0${Math.floor(v)}`.slice(-2))
    .join(':');

const WaveformPlayer = ({ clips, updateClipOffset, selectedClip, videoRef }) => {
  const { wavPath, highlightLabels, highlightedSections } = useAppContext(); // Access highlightLabels from context
  const containerRef = useRef(null);
  const timelineContainerRef = useRef(null);
  const wavesurferRef = useRef(null);
  const timelinePluginRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioLoaded, setAudioLoaded] = useState(false);

  useEffect(() => {
    console.log('WaveformPlayer clips:', clips);
    setAudioLoaded(false);
    if (!clips?.length || !wavPath) return; // Ensure wavPath is available

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
      height: 100,
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

    // Load audio from wavPath (from AppContext) using electronAPI to get a Blob URL
    window.electronAPI.readFileAsBlob(wavPath).then((arrayBuffer) => {
      const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
      const blobUrl = URL.createObjectURL(blob);
      ws.load(blobUrl);
    });

    ws.on('decode', () => {
      setAudioLoaded(true);
      // Remove any existing regions
      regions.getRegions().forEach(r => r.remove());
      // Add regions for each transcript segment (clip)
      if (clips && Array.isArray(clips)) {
        let regionCount = 0;
        clips.forEach((clip, idx) => {
          if (typeof clip.start !== 'number' || typeof clip.end !== 'number' || clip.start >= clip.end) {
            console.warn(`Skipping invalid clip at idx ${idx}:`, clip);
            return;
          }
          // Check if this region is highlighted
          let regionColor = 'rgba(200,200,200,0.5)'; // base color: light grey
          if (Array.isArray(highlightedSections)) {
            const match = highlightedSections.find(h =>
              h.startTime <= clip.start && h.endTime >= clip.end
            );
            if (match && match.color) {
              regionColor = match.color + '55'; // semi-transparent highlight
            }
          }
          const region = regions.addRegion({
            id: `clip-${clip.id ?? idx}`,
            start: clip.start,
            end: clip.end,
            color: regionColor,
            drag: false,
            resize: false,
          });
          region.on('update-end', () => {
            const newStartOffset = region.start - clip.start;
            const newEndOffset = region.end - clip.end;
            updateClipOffset?.(clip.id, 'startOffset', newStartOffset - (clip.startOffset || 0));
            updateClipOffset?.(clip.id, 'endOffset', newEndOffset - (clip.endOffset || 0));
          });
        });
        console.log('WaveformPlayer: regions created:', regionCount);
      }
      const duration = ws.getDuration();
      const containerWidth = containerRef.current.offsetWidth;
      const autoZoom = containerWidth / duration;
      ws.zoom(autoZoom);
      setZoomLevel(autoZoom);
      timelinePluginRef.current?.updateCanvas?.();
    });

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
        };
        }



    ws.on('timeupdate', () => {
      setCurrentTime(ws.getCurrentTime());
    });

    return () => {
      ws.destroy();
    };
  }, [clips, wavPath, highlightLabels, highlightedSections]); // add highlightLabels and highlightedSections to dependencies

  // Add a new effect to update zoom only when zoomLevel changes and audio is loaded
  useEffect(() => {
    if (audioLoaded && wavesurferRef.current) {
      wavesurferRef.current.zoom(zoomLevel);
      timelinePluginRef.current?.updateCanvas?.();
    }
  }, [zoomLevel, audioLoaded]);

  const changeZoom = (delta) => {
    if (!audioLoaded) return;
    const next = Math.max(0.1, Math.min(1000, zoomLevel + delta));
    setZoomLevel(next);
    wavesurferRef.current?.zoom(next);
    timelinePluginRef.current?.updateCanvas?.();
  };

  return (
    <div style={{ padding: 10 }}>
      <h4>🎛️ Waveform Player</h4>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          marginBottom: 0,
          border: '1px solid #ccc',
          background: '#f6f6f6',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
        }}
      />
      <div ref={timelineContainerRef} style={{ height: 20, marginBottom: 10 }} />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={() => changeZoom(-20)} disabled={!audioLoaded}>➖</button>
        <button onClick={() => changeZoom(20)} disabled={!audioLoaded}>➕</button>
        <span>Zoom: {Math.round(zoomLevel)}px/s</span>
        <span>🕒 {formatTime(currentTime)}</span>
      </div>
    </div>
  );
};

export default WaveformPlayer;
