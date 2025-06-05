// src/VideoPlayer.jsx
import React, { useEffect } from 'react';

const VideoPlayer = ({ src, videoRef }) => {
  useEffect(() => {
    if (videoRef?.current) {
      console.log("Video loaded:", src);
    }
  }, [src]);

  return (
    <video
      ref={videoRef}
      src={src}
      controls
      style={{ width: '100%', marginTop: 10 }}
    />
  );
};

export default VideoPlayer;
