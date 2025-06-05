// src/FilePicker.jsx
import React from 'react';

const FilePicker = ({ onFileSelected }) => {
  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onFileSelected(url);
    }
  };

  return (
    <div>
      <input type="file" accept="video/*" onChange={handleChange} />
    </div>
  );
};

export default FilePicker;
