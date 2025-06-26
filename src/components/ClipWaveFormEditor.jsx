import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/plugins/regions';
import TimelinePlugin from 'wavesurfer.js/plugins/timeline';
import { useAppContext } from '../context/AppContext';

const formatTime = (seconds) =>
  [seconds / 60, seconds % 60]
    .map((v) => `0${Math.floor(v)}`.slice(-2))
    .join(':');

const ClipWaveformEditor = ({ clips, videoRef, updateClipOffset, selectedClip }) => {
  const { wavPath } = useAppContext();
  const containerRef = useRef(null);
  const timelineContainerRef = useRef(null);
  const wavesurferRef = useRef(null);
  const timelinePluginRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (!clips?.length || !wavPath) return;

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
      minPxPerSec: zoomLevel,
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

    // Force timeline update on scroll
    const scrollEl = containerRef.current;
    const handleScroll = () => {
      timelinePluginRef.current?.updateCanvas?.();
    };
    scrollEl?.addEventListener('scroll', handleScroll);

    window.electronAPI.readFileAsBlob(wavPath).then((arrayBuffer) => {
      const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
      const blobUrl = URL.createObjectURL(blob);
      ws.load(blobUrl);
    });

    ws.on('decode', () => {
      if (restoreTime) {
        ws.once('redraw', () => {
          ws.setTime(Math.min(restoreTime, ws.getDuration() - 0.1));
        });
      }

      regions.getRegions().forEach(r => r.remove());

      clips.forEach((clip) => {
        const startTime = clip.start + (clip.startOffset || 0);
        const endTime = clip.end + (clip.endOffset || 0);
        const regionColor = clip.__highlightColor
          ? clip.__highlightColor + '55'
          : 'rgba(255, 204, 0, 0.3)';

        const region = regions.addRegion({
          id: `clip-${clip.id}`,
          start: startTime,
          end: endTime,
          color: regionColor,
          drag: true,
          resize: true,
        });

        region.on('update-end', () => {
          const newStartOffset = region.start - clip.start;
          const newEndOffset = region.end - clip.end;

          updateClipOffset?.(clip.id, 'startOffset', newStartOffset - (clip.startOffset || 0));
          updateClipOffset?.(clip.id, 'endOffset', newEndOffset - (clip.endOffset || 0));
        });
      });

      const duration = ws.getDuration();
      const containerWidth = containerRef.current.offsetWidth;
      const autoZoom = containerWidth / duration;

      ws.zoom(autoZoom);
      setZoomLevel(autoZoom);
      timelinePluginRef.current?.updateCanvas?.();
    });

    ws.on('timeupdate', () => {
      setCurrentTime(ws.getCurrentTime());
    });

    return () => {
      ws.destroy();
      scrollEl?.removeEventListener('scroll', handleScroll);
    };
  }, [clips, wavPath]);

  useEffect(() => {
    const video = videoRef?.current || document.querySelector('video');
    const interval = setInterval(() => {
      if (video && !video.paused && wavesurferRef.current) {
        wavesurferRef.current.setTime(video.currentTime);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [videoRef]);

  useEffect(() => {
    if (!selectedClip || !videoRef?.current) return;
    const video = videoRef.current;

    const handleTimeUpdate = () => {
      const end = selectedClip.end + (selectedClip.endOffset || 0);
      if (video.currentTime >= end) {
        video.pause();
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [selectedClip, videoRef]);

  const changeZoom = (delta) => {
    const next = Math.max(0.1, Math.min(1000, zoomLevel + delta));
    setZoomLevel(next);
    wavesurferRef.current?.zoom(next);
    timelinePluginRef.current?.updateCanvas?.();
  };

  if (!clips?.length) return null;

  return (
    <div style={{ padding: 10 }}>
      <h4>🎛️ Fine-Tune Clip (Waveform)</h4>
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
        <button onClick={() => changeZoom(-20)}>➖</button>
        <button onClick={() => changeZoom(20)}>➕</button>
        <span>Zoom: {Math.round(zoomLevel)}px/s</span>
        <span>🕒 {formatTime(currentTime)}</span>
      </div>
    </div>
  );
};

export default ClipWaveformEditor;
