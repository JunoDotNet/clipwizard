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
      style={{
        width: 960,
        aspectRatio: '16 / 9',
        background: 'black',
        margin: '20px auto',
        display: 'block',
      }}
    />
  );
};

export default VideoPlayer;
