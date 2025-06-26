import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/plugins/regions';
import { useAppContext } from '../context/AppContext';


const ClipWaveformEditor = ({ clip, updateClipOffset }) => {
  const { wavPath } = useAppContext();
  const containerRef = useRef(null);
  const wavesurferRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(0);


  useEffect(() => {
    if (!clip || !wavPath) return;

    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
    }

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#a0c4ff',
      progressColor: '#3a86ff',
      cursorColor: '#000',
      height: 100,
    });

    const regions = ws.registerPlugin(RegionsPlugin.create());
    wavesurferRef.current = ws;

    window.electronAPI.readFileAsBlob(wavPath).then((arrayBuffer) => {
      const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
      const blobUrl = URL.createObjectURL(blob);
      ws.load(blobUrl);
    });

    ws.on('decode', () => {
      const startTime = clip.start + (clip.startOffset || 0);
      const endTime = clip.end + (clip.endOffset || 0);
      regions.addRegion({
        id: 'clip-region',
        start: startTime,
        end: endTime,
        color: 'rgba(255, 204, 0, 0.3)',
        drag: true,
        resize: true,
      });

      regions.on('region-updated', (r) => {
        if (r.id !== 'clip-region') return;
        const newStartOffset = r.start - clip.start;
        const newEndOffset = r.end - clip.end;
        updateClipOffset(clip.id, 'startOffset', newStartOffset - (clip.startOffset || 0));
        updateClipOffset(clip.id, 'endOffset', newEndOffset - (clip.endOffset || 0));
      });
    });

    return () => {
      ws.destroy();
    };
  }, [clip, wavPath]);

  useEffect(() => {
    const video = document.querySelector('video'); // or pass videoRef if available
    const interval = setInterval(() => {
        if (video && !video.paused && wavesurferRef.current) {
        wavesurferRef.current.setTime(video.currentTime);
        }
    }, 100);

    return () => clearInterval(interval);
    }, []);


  if (!clip) return null;

  return (
    <div>
      <h4>🎛️ Fine-Tune Clip (Waveform)</h4>
      <div ref={containerRef} style={{ width: '100%', marginBottom: 10 }} />
    </div>
  );
};

export default ClipWaveformEditor;
