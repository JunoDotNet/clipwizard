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
    <div style={{ marginTop: hideTitle ? 0 : `var(--scaled-spacing-lg, 20px)` }}>
      {!hideTitle && (
        <h4 style={{
          margin: 0,
          fontSize: `var(--scaled-font-base, 14px)`,
          color: '#ddd',
          marginBottom: `var(--scaled-spacing-sm, 8px)`
        }}>
          🎨 Highlight Labels
        </h4>
      )}

      {highlightLabels.map(label => (
        <div key={label.id} style={{ 
          display: 'flex', 
          alignItems: 'center', 
          marginBottom: `var(--scaled-spacing-xs, 6px)` 
        }}>
            <div
            style={{
                width: `calc(20px * var(--app-scale, 1))`,
                height: `calc(20px * var(--app-scale, 1))`,
                backgroundColor: label.color,
                marginRight: `var(--scaled-spacing-sm, 8px)`,
                borderRadius: `var(--scaled-border-radius, 3px)`,
                border: `var(--scaled-border-width, 1px) solid #555`,
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
                style={{
                  width: `calc(40px * var(--app-scale, 1))`,
                  height: `calc(24px * var(--app-scale, 1))`,
                  border: `var(--scaled-border-width, 1px) solid #555`,
                  borderRadius: `var(--scaled-border-radius, 4px)`,
                }}
                />
                <input
                key={label.id}
                type="text"
                value={editValues.name}
                onChange={(e) =>
                    setEditValues(prev => ({ ...prev, name: e.target.value }))
                }
                style={{ 
                  marginLeft: `var(--scaled-spacing-sm, 8px)`,
                  padding: `var(--scaled-spacing-xs, 4px)`,
                  fontSize: `var(--scaled-font-sm, 12px)`,
                  background: '#444',
                  border: `var(--scaled-border-width, 1px) solid #555`,
                  color: '#ddd',
                  borderRadius: `var(--scaled-border-radius, 4px)`,
                }}
                autoFocus
                />
                <button 
                  onClick={() => handleEditSave(label.id)} 
                  style={{ 
                    marginLeft: `var(--scaled-spacing-sm, 8px)`,
                    padding: `var(--scaled-spacing-xs, 4px) var(--scaled-spacing-sm, 6px)`,
                    fontSize: `var(--scaled-font-sm, 12px)`,
                    background: '#0066cc',
                    border: `var(--scaled-border-width, 1px) solid #555`,
                    color: '#ddd',
                    borderRadius: `var(--scaled-border-radius, 4px)`,
                    cursor: 'pointer'
                  }}
                >
                ✅ Save
                </button>
                <button 
                  onClick={() => setEditingId(null)} 
                  style={{ 
                    marginLeft: `var(--scaled-spacing-xs, 4px)`,
                    padding: `var(--scaled-spacing-xs, 4px) var(--scaled-spacing-sm, 6px)`,
                    fontSize: `var(--scaled-font-sm, 12px)`,
                    background: '#666',
                    border: `var(--scaled-border-width, 1px) solid #555`,
                    color: '#ddd',
                    borderRadius: `var(--scaled-border-radius, 4px)`,
                    cursor: 'pointer'
                  }}
                >
                ❌ Cancel
                </button>
            </>
            ) : (
            <>
                <span style={{ 
                  flex: 1,
                  fontSize: `var(--scaled-font-sm, 12px)`,
                  color: '#ddd'
                }}>{label.name}</span>
                <button 
                  onClick={() => setActiveLabelId(label.id)} 
                  disabled={lockUI}
                  style={{
                    padding: `var(--scaled-spacing-xs, 4px) var(--scaled-spacing-sm, 8px)`,
                    fontSize: `var(--scaled-font-sm, 12px)`,
                    background: lockUI ? '#555' : '#0066cc',
                    border: `var(--scaled-border-width, 1px) solid #555`,
                    color: '#ddd',
                    borderRadius: `var(--scaled-border-radius, 4px)`,
                    cursor: lockUI ? 'not-allowed' : 'pointer'
                  }}
                >Use</button>
                <button
                onClick={() => {
                    setEditValues({ name: label.name, color: label.color });
                    setEditingId(label.id);
                    setIsAdding(false);
                    setError('');
                }}
                style={{ 
                  marginLeft: `var(--scaled-spacing-xs, 4px)`,
                  padding: `var(--scaled-spacing-xs, 4px) var(--scaled-spacing-sm, 6px)`,
                  fontSize: `var(--scaled-font-sm, 12px)`,
                  background: lockUI ? '#555' : '#666',
                  border: `var(--scaled-border-width, 1px) solid #555`,
                  color: '#ddd',
                  borderRadius: `var(--scaled-border-radius, 4px)`,
                  cursor: lockUI ? 'not-allowed' : 'pointer'
                }}
                disabled={lockUI}
                >
                ✏️ Edit
                </button>
                <button
                onClick={() => handleDelete(label.id)}
                style={{
                    marginLeft: `var(--scaled-spacing-xs, 4px)`,
                    padding: `var(--scaled-spacing-xs, 4px)`,
                    fontSize: `var(--scaled-font-sm, 12px)`,
                    background: 'transparent',
                    border: 'none',
                    color: lockUI ? '#999' : 'red',
                    cursor: lockUI ? 'not-allowed' : 'pointer',
                    borderRadius: `var(--scaled-border-radius, 4px)`
                }}
                disabled={lockUI}
                >
                🗑️
                </button>
            </>
            )}
        </div> // ✅ <-- Add this to fix your error
        ))}


      <div style={{ marginTop: `var(--scaled-spacing-base, 10px)` }}>
        {!hideAddButton && (actualIsAdding ? (
          <div>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: `var(--scaled-spacing-xs, 6px)`, 
              marginBottom: `var(--scaled-spacing-xs, 6px)` 
            }}>
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
                      width: `calc(20px * var(--app-scale, 1))`,
                      height: `calc(20px * var(--app-scale, 1))`,
                      backgroundColor: color,
                      border: editValues.color === color ? 
                        `calc(2px * var(--app-scale, 1)) solid black` : 
                        `var(--scaled-border-width, 1px) solid #ccc`,
                      opacity: isUsed ? 0.4 : 1,
                      cursor: isUsed ? 'not-allowed' : 'pointer',
                      borderRadius: `var(--scaled-border-radius, 3px)`
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
              style={{ 
                marginRight: `var(--scaled-spacing-sm, 8px)`,
                width: `calc(40px * var(--app-scale, 1))`,
                height: `calc(24px * var(--app-scale, 1))`,
                border: `var(--scaled-border-width, 1px) solid #555`,
                borderRadius: `var(--scaled-border-radius, 4px)`,
              }}
            />
            <input
              ref={nameInputRef}
              type="text"
              placeholder="Label name"
              value={editValues.name}
              onChange={(e) =>
                setEditValues(prev => ({ ...prev, name: e.target.value }))
              }
              style={{ 
                marginLeft: `var(--scaled-spacing-sm, 8px)`,
                padding: `var(--scaled-spacing-xs, 4px)`,
                fontSize: `var(--scaled-font-sm, 12px)`,
                background: '#444',
                border: `var(--scaled-border-width, 1px) solid #555`,
                color: '#ddd',
                borderRadius: `var(--scaled-border-radius, 4px)`,
                flex: 1
              }}
            />
            <button
              onClick={handleAdd}
              style={{ 
                marginLeft: `var(--scaled-spacing-sm, 8px)`,
                padding: `var(--scaled-spacing-xs, 4px) var(--scaled-spacing-sm, 6px)`,
                fontSize: `var(--scaled-font-sm, 12px)`,
                background: editValues.name.trim() ? '#0066cc' : '#555',
                border: `var(--scaled-border-width, 1px) solid #555`,
                color: '#ddd',
                borderRadius: `var(--scaled-border-radius, 4px)`,
                cursor: editValues.name.trim() ? 'pointer' : 'not-allowed'
              }}
              disabled={!editValues.name.trim()}
            >
              Add
            </button>
            <button
              onClick={() => {
                actualSetIsAdding(false);
                setError('');
              }}
              style={{ 
                marginLeft: `var(--scaled-spacing-xs, 6px)`,
                padding: `var(--scaled-spacing-xs, 4px) var(--scaled-spacing-sm, 6px)`,
                fontSize: `var(--scaled-font-sm, 12px)`,
                background: '#666',
                border: `var(--scaled-border-width, 1px) solid #555`,
                color: '#ddd',
                borderRadius: `var(--scaled-border-radius, 4px)`,
                cursor: 'pointer'
              }}
            >
              ❌ Cancel
            </button>
            {error && (
              <p style={{ 
                color: 'red', 
                marginTop: `var(--scaled-spacing-xs, 6px)`,
                fontSize: `var(--scaled-font-sm, 12px)`
              }}>
                {error}
              </p>
            )}
          </div>
        ) : (
          <button 
            onClick={startAdd}
            style={{
              padding: `var(--scaled-spacing-xs, 4px) var(--scaled-spacing-sm, 8px)`,
              fontSize: `var(--scaled-font-sm, 12px)`,
              background: '#444',
              border: `var(--scaled-border-width, 1px) solid #555`,
              color: '#ddd',
              borderRadius: `var(--scaled-border-radius, 4px)`,
              cursor: 'pointer'
            }}
          >+ Add Label</button>
        ))}
      </div>
    </div>
  );
};

export default HighlightLabelManager;
