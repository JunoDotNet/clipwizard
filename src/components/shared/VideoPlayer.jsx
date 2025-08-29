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
      style={{
        width: `calc(600px * var(--app-scale, 1))`,
        height: `calc(336px * var(--app-scale, 1))`,
        maxWidth: '100%',
        background: 'black',
        display: 'block',
        borderRadius: `var(--scaled-border-radius, 4px)`,
        border: `var(--scaled-border-width, 1px) solid #333`,
      }}
    />
  );
};

export default VideoPlayer;
