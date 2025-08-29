import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';


const AddCustomClip = ({ onAddClip }) => {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [text, setText] = useState('');
  const { transcript } = useAppContext();


  const handleSubmit = () => {
    const startNum = parseFloat(start);
    const endNum = parseFloat(end);

    if (
        !Number.isFinite(startNum) ||
        !Number.isFinite(endNum) ||
        startNum >= endNum ||
        !text.trim()
    ) {
        alert('Please enter valid start/end times and text.');
        return;
    }

    const newLine = {
        id: `manual-${Date.now()}`,
        start: startNum,
        end: endNum,
        text: text.trim(),
    };

    const overlaps = transcript.some(
        (line) => !(newLine.end <= line.start || newLine.start >= line.end)
    );

    if (overlaps) {
        alert('⚠️ That custom clip overlaps with an existing transcript line.');
        return;
    }

    onAddClip(newLine);
    setStart('');
    setEnd('');
    setText('');
    };


  return (
    <div style={{ marginTop: 20, padding: 10, border: '1px solid #ccc', background: '#f7f7f7' }}>
      <h4>➕ Add Custom Transcript Line (by seconds)</h4>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          type="number"
          placeholder="Start (s)"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          style={{ width: 100 }}
        />
        <input
          type="number"
          placeholder="End (s)"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          style={{ width: 100 }}
        />
      </div>
      <textarea
        rows={2}
        style={{ width: '100%', marginBottom: 6 }}
        placeholder="Enter transcript text"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div>
        <button onClick={handleSubmit}>✅ Add Line</button>
      </div>
    </div>
  );
};

export default AddCustomClip;
