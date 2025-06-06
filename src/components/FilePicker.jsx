import React from 'react';

const FilePicker = ({ onFileSelected }) => {
  const handleClick = async () => {
    const filePath = await window.electronAPI.selectVideoFile();
    if (!filePath) return;

    const buffer = await window.electronAPI.readVideoBuffer(filePath);
    const blob = new Blob([buffer]);
    const fileName = filePath.split(/[\\/]/).pop();
    const url = URL.createObjectURL(blob);

    const file = new File([blob], fileName, { type: blob.type });

    onFileSelected(url, {
      name: fileName,
      path: filePath,
      type: blob.type,
      originalFile: file,
    });
  };

  return <button onClick={handleClick}>📂 Choose Video File</button>;
};

export default FilePicker;
