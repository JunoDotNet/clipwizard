import { useCallback } from 'react';

// 🔁 Merge clips that are back-to-back (e.g., 12.5s–13.0s and 13.0s–14.0s)
function mergeSequentialClips(clips, tolerance = 0.1) {
  if (!clips.length) return [];

  const merged = [];
  let current = { ...clips[0] };

  for (let i = 1; i < clips.length; i++) {
    const next = clips[i];

    const isSequential = Math.abs(current.end - next.start) <= tolerance;
    if (isSequential) {
      current.end = next.end;
    } else {
      merged.push(current);
      current = { ...next };
    }
  }

  merged.push(current);
  return merged;
}

// 🎚 Apply fine-tune offsets to each clip
function applyClipOffsets(clips, videoDuration) {
  return clips.map((clip) => {
    const { start, end, startOffset = 0, endOffset = 0 } = clip;

    return {
      ...clip,
      adjustedStart: Math.max(0, start + startOffset),
      adjustedEnd: Math.min(videoDuration, end + endOffset),
    };
  });
}

const useClipPlayback = (videoRef) => {
  const playClips = useCallback((clips) => {
    if (!videoRef?.current || clips.length === 0) return;

    const video = videoRef.current;
    const mergedClips = mergeSequentialClips(clips);
    const offsetClips = applyClipOffsets(mergedClips, video.duration); // ✅ now apply offsets

    let index = 0;

    const playNext = () => {
      if (index >= offsetClips.length) return;

      const { adjustedStart, adjustedEnd } = offsetClips[index];

      video.pause();
      video.currentTime = adjustedStart;

      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);

        video.play().catch((err) => {
          if (err.name !== 'AbortError') {
            console.warn('⚠️ video.play() error:', err.message);
          }
        });

        const onTimeUpdate = () => {
          if (video.currentTime >= adjustedEnd) {
            video.pause();
            video.removeEventListener('timeupdate', onTimeUpdate);
            index++;
            playNext();
          }
        };

        video.addEventListener('timeupdate', onTimeUpdate);
      };

      video.addEventListener('seeked', onSeeked);
    };
    playNext();
  }, [videoRef]);

  return { playClips };
};

export default useClipPlayback;
