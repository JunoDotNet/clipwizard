import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { v4 as uuidv4 } from 'uuid';

const presetColors = [
  '#FF6633', '#FFB399', '#FF33FF', '#FFFF99',
  '#00B3E6', '#E6B333', '#3366E6', '#999966',
  '#99FF99', '#B34D4D', '#80B300', '#809900',
];



const HighlightLabelManager = ({ 
  setActiveLabelId, 
  hideTitle = false, 
  hideAddButton = false,
  isAddingLabel = null,
  setIsAddingLabel = null 
}) => {
  const {
    highlightLabels,
    setHighlightLabels,
    highlightedSections,
    setHighlightedSections,
  } = useAppContext();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ name: '', color: '#ffcc00' });
  const [error, setError] = useState('');
  const nameInputRef = useRef(null);

  // Use external isAddingLabel state if provided, otherwise use local state
  const actualIsAdding = isAddingLabel !== null ? isAddingLabel : isAdding;
  const actualSetIsAdding = setIsAddingLabel || setIsAdding;

  const lockUI = actualIsAdding || editingId !== null;

  useEffect(() => {
  if (editingId && !highlightLabels.find(l => l.id === editingId)) {
    setEditingId(null);
  }
}, [highlightLabels, editingId]);


  useEffect(() => {
    if (actualIsAdding && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [actualIsAdding]);

  const startAdd = () => {
    setEditValues({ name: '', color: '#ffcc00' });
    actualSetIsAdding(true);
    setEditingId(null);
    setError('');
  };

  const handleAdd = () => {
    const colorInUse = highlightLabels.some(label => label.color === editValues.color);
    if (colorInUse) {
      setError('❌ That color is already used. Pick a different one.');
      return;
    }

    const newLabel = {
      id: uuidv4(),
      name: editValues.name || 'Unnamed',
      color: editValues.color,
    };

    setHighlightLabels(prev => [...prev, newLabel]);
    actualSetIsAdding(false);
    setError('');
  };

  const handleEditSave = (id) => {
    setHighlightLabels(prev =>
      prev.map(label =>
        label.id === id ? { ...label, name: editValues.name, color: editValues.color } : label
      )
    );
    setEditingId(null);
    setError('');
  };

  const handleDelete = (id) => {
    if (lockUI) return;
    if (window.confirm('Delete this label?')) {
      setHighlightLabels(prev => prev.filter(label => label.id !== id));
      setHighlightedSections(prev => prev.filter(h => h.labelId !== id));
      if (editingId === id) setEditingId(null);
    }
  };

  return (
    <div style={{ marginTop: hideTitle ? 0 : 20 }}>
      {!hideTitle && <h4>🎨 Highlight Labels</h4>}

      {highlightLabels.map(label => (
        <div key={label.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
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
                value={editValues.color}
                onChange={(e) =>
                    setEditValues(prev => ({ ...prev, color: e.target.value }))
                }
                />
                <input
                key={label.id}
                type="text"
                value={editValues.name}
                onChange={(e) =>
                    setEditValues(prev => ({ ...prev, name: e.target.value }))
                }
                style={{ marginLeft: 8 }}
                autoFocus
                />
                <button onClick={() => handleEditSave(label.id)} style={{ marginLeft: 8 }}>
                ✅ Save
                </button>
                <button onClick={() => setEditingId(null)} style={{ marginLeft: 4 }}>
                ❌ Cancel
                </button>
            </>
            ) : (
            <>
                <span style={{ flex: 1 }}>{label.name}</span>
                <button onClick={() => setActiveLabelId(label.id)} disabled={lockUI}>Use</button>
                <button
                onClick={() => {
                    setEditValues({ name: label.name, color: label.color });
                    setEditingId(label.id);
                    setIsAdding(false);
                    setError('');
                }}
                style={{ marginLeft: 4 }}
                disabled={lockUI}
                >
                ✏️ Edit
                </button>
                <button
                onClick={() => handleDelete(label.id)}
                style={{
                    marginLeft: 4,
                    color: 'red',
                    filter: lockUI ? 'grayscale(100%) opacity(0.5)' : 'none',
                }}
                disabled={lockUI}
                >
                🗑️
                </button>
            </>
            )}
        </div> // ✅ <-- Add this to fix your error
        ))}


      <div style={{ marginTop: 10 }}>
        {!hideAddButton && (actualIsAdding ? (
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
              {presetColors.map(color => {
                const isUsed = highlightLabels.some(label => label.color === color);
                return (
                  <button
                    key={color}
                    onClick={() => {
                      if (!isUsed) {
                        setEditValues(prev => ({ ...prev, color }));
                        setError('');
                      }
                    }}
                    style={{
                      width: 20,
                      height: 20,
                      backgroundColor: color,
                      border: editValues.color === color ? '2px solid black' : '1px solid #ccc',
                      opacity: isUsed ? 0.4 : 1,
                      cursor: isUsed ? 'not-allowed' : 'pointer',
                    }}
                    disabled={isUsed}
                    title={isUsed ? 'Color already in use' : color}
                  />
                );
              })}
            </div>

            <input
              type="color"
              value={editValues.color}
              onChange={(e) =>
                setEditValues(prev => ({ ...prev, color: e.target.value }))
              }
              style={{ marginRight: 8 }}
            />
            <input
              ref={nameInputRef}
              type="text"
              placeholder="Label name"
              value={editValues.name}
              onChange={(e) =>
                setEditValues(prev => ({ ...prev, name: e.target.value }))
              }
              style={{ marginLeft: 8 }}
            />
            <button
              onClick={handleAdd}
              style={{ marginLeft: 8 }}
              disabled={!editValues.name.trim()}
            >
              Add
            </button>
            <button
              onClick={() => {
                actualSetIsAdding(false);
                setError('');
              }}
              style={{ marginLeft: 6 }}
            >
              ❌ Cancel
            </button>
            {error && <p style={{ color: 'red', marginTop: 6 }}>{error}</p>}
          </div>
        ) : (
          <button onClick={startAdd}>+ Add Label</button>
        ))}
      </div>
    </div>
  );
};

export default HighlightLabelManager;
