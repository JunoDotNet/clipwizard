import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { v4 as uuidv4 } from 'uuid';

const presetColors = [
  '#FF6633', '#FFB399', '#FF33FF', '#FFFF99',
  '#00B3E6', '#E6B333', '#3366E6', '#999966',
  '#99FF99', '#B34D4D', '#80B300', '#809900',
];

const HighlightLabelManager = ({ setActiveLabelId }) => {
  const {
    highlightLabels,
    setHighlightLabels,
    highlightedSections,
    setHighlightedSections,
  } = useAppContext();

  const [editing, setEditing] = useState(false);
  const [newColor, setNewColor] = useState('#ffcc00');
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const nameInputRef = useRef(null);

  useEffect(() => {
    if (editing && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [highlightLabels, editing]);

  const handleAdd = () => {
    const colorInUse = highlightLabels.some(label => label.color === newColor);
    if (colorInUse) {
      alert('That color is already in use. Please choose a different one.');
      return;
    }

    const id = uuidv4();
    setHighlightLabels(prev => [...prev, {
      id,
      name: newName || 'Unnamed',
      color: newColor
    }]);
    setNewColor('#ffcc00');
    setNewName('');
    setEditing(false);
  };

  const handleEditSave = (id) => {
    setHighlightLabels(prev =>
      prev.map(label =>
        label.id === id ? { ...label, name: newName, color: newColor } : label
      )
    );
    setEditingId(null);
    setNewName('');
    setNewColor('#ffcc00');
  };

  const handleDelete = (id) => {
    const confirmDelete = window.confirm('Delete this label?');
    if (confirmDelete) {
      setHighlightLabels(prev => prev.filter(label => label.id !== id));
      setHighlightedSections(prev => prev.filter(h => h.labelId !== id));
      if (editingId === id) setEditingId(null);
    }
  };

  return (
    <div style={{ marginTop: 20 }}>
      <h4>🎨 Highlight Labels</h4>

      {highlightLabels.map(label => (
        <div
          key={label.id}
          style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              backgroundColor: label.color,
              marginRight: 8,
            }}
          />
          {editingId === label.id ? (
            <>
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
              />
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={{ marginLeft: 8 }}
                autoFocus
              />
              <button
                onClick={() => handleEditSave(label.id)}
                style={{ marginLeft: 8 }}
              >
                ✅ Save
              </button>
              <button
                onClick={() => setEditingId(null)}
                style={{ marginLeft: 4 }}
              >
                ❌ Cancel
              </button>
            </>
          ) : (
            <>
              <span style={{ flex: 1 }}>{label.name}</span>
              <button onClick={() => setActiveLabelId(label.id)} disabled={editing}>Use</button>
              <button
                onClick={() => {
                  setEditingId(label.id);
                  setNewColor(label.color);
                  setNewName(label.name);
                }}
                style={{ marginLeft: 4 }}
                disabled={editing}
              >
                ✏️ Edit
              </button>
              <button
                onClick={() => handleDelete(label.id)}
                style={{
                  marginLeft: 4,
                  color: 'red',
                  filter: editing ? 'grayscale(100%) opacity(0.5)' : 'none',
                }}
                disabled={editing}
              >
                🗑️
              </button>
            </>
          )}
        </div>
      ))}

      {/* Add Label Form */}
      <div style={{ marginTop: 10 }}>
        {editing ? (
          <div>
            {/* Preset color swatches */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
              {presetColors.map(color => {
                const isUsed = highlightLabels.some(label => label.color === color);
                return (
                  <button
                    key={color}
                    onClick={() => !isUsed && setNewColor(color)}
                    style={{
                      width: 20,
                      height: 20,
                      backgroundColor: color,
                      border: newColor === color ? '2px solid black' : '1px solid #ccc',
                      opacity: isUsed ? 0.4 : 1,
                      cursor: isUsed ? 'not-allowed' : 'pointer'
                    }}
                    disabled={isUsed}
                    title={isUsed ? 'Color already in use' : color}
                  />
                );
              })}
            </div>

            {/* Custom color input */}
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              style={{ marginRight: 8 }}
            />
            <input
              ref={nameInputRef}
              type="text"
              placeholder="Label name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={{ marginLeft: 8 }}
            />
            <button onClick={handleAdd} style={{ marginLeft: 8 }}>
              Add
            </button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)}>+ Add Label</button>
        )}
      </div>
    </div>
  );
};

export default HighlightLabelManager;
