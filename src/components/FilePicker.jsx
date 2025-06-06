// src/components/FilePicker.jsx
import React from 'react';

const FilePicker = ({ onFileSelected }) => {
  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      onFileSelected(objectUrl, file); // ✅ pass the full File object
    }
  };

  return (
    <div>
        <input type="file" accept="video/*,.wav,.mp3" onChange={handleChange} />
    </div>
  );
};

export default FilePicker;
