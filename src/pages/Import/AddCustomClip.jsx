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
    <div style={{ 
      marginTop: `var(--scaled-spacing-lg, 20px)`, 
      padding: `var(--scaled-spacing-base, 10px)`, 
      border: `var(--scaled-border-width, 1px) solid #555`, 
      background: '#333',
      borderRadius: `var(--scaled-border-radius, 4px)`
    }}>
      <h4 style={{
        margin: `0 0 var(--scaled-spacing-sm, 8px) 0`,
        fontSize: `var(--scaled-font-base, 14px)`,
        color: '#ddd'
      }}>➕ Add Custom Transcript Line (by seconds)</h4>
      <div style={{ 
        display: 'flex', 
        gap: `var(--scaled-spacing-sm, 8px)`, 
        marginBottom: `var(--scaled-spacing-sm, 8px)` 
      }}>
        <input
          type="number"
          placeholder="Start (s)"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          style={{ 
            width: `calc(100px * var(--app-scale, 1))`,
            padding: `var(--scaled-spacing-xs, 4px)`,
            fontSize: `var(--scaled-font-sm, 12px)`,
            background: '#444',
            border: `var(--scaled-border-width, 1px) solid #555`,
            color: '#ddd',
            borderRadius: `var(--scaled-border-radius, 4px)`
          }}
        />
        <input
          type="number"
          placeholder="End (s)"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          style={{ 
            width: `calc(100px * var(--app-scale, 1))`,
            padding: `var(--scaled-spacing-xs, 4px)`,
            fontSize: `var(--scaled-font-sm, 12px)`,
            background: '#444',
            border: `var(--scaled-border-width, 1px) solid #555`,
            color: '#ddd',
            borderRadius: `var(--scaled-border-radius, 4px)`
          }}
        />
      </div>
      <textarea
        rows={2}
        style={{ 
          width: '100%', 
          marginBottom: `var(--scaled-spacing-xs, 6px)`,
          padding: `var(--scaled-spacing-xs, 4px)`,
          fontSize: `var(--scaled-font-sm, 12px)`,
          background: '#444',
          border: `var(--scaled-border-width, 1px) solid #555`,
          color: '#ddd',
          borderRadius: `var(--scaled-border-radius, 4px)`,
          resize: 'vertical',
          boxSizing: 'border-box'
        }}
        placeholder="Enter transcript text"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div>
        <button 
          onClick={handleSubmit}
          style={{
            padding: `var(--scaled-spacing-xs, 4px) var(--scaled-spacing-sm, 8px)`,
            fontSize: `var(--scaled-font-sm, 12px)`,
            background: '#0066cc',
            border: `var(--scaled-border-width, 1px) solid #555`,
            color: '#ddd',
            borderRadius: `var(--scaled-border-radius, 4px)`,
            cursor: 'pointer'
          }}
        >✅ Add Line</button>
      </div>
    </div>
  );
};

export default AddCustomClip;
