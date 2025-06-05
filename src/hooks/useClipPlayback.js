// src/hooks/useClipPlayback.js
import { useCallback } from 'react'; // ✅ DO NOT import FilePicker or VideoPlayer here

const useClipPlayback = (videoRef) => {
  const playClips = useCallback((clips) => {
    if (!videoRef?.current || clips.length === 0) return;

    let index = 0;

    const playNext = () => {
      if (index >= clips.length) return;

      const { start, end } = clips[index];
      const video = videoRef.current;

      video.currentTime = start;
      video.play();

      const onTimeUpdate = () => {
        if (video.currentTime >= end) {
          video.pause();
          video.removeEventListener('timeupdate', onTimeUpdate);
          index++;
          playNext();
        }
      };

      video.addEventListener('timeupdate', onTimeUpdate);
    };

    playNext();
  }, [videoRef]);

  return { playClips };
};

export default useClipPlayback;
