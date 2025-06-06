import React, { useState, useEffect } from 'react';


const ClipTabs = ({ tabs, activeTabId, setActiveTabId, addTab, renameTab, deleteTab }) => {
  const [editingId, setEditingId] = useState(null);
  const [tempName, setTempName] = useState('');

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
      {tabs.map((tab) => (
        <div key={tab.id} style={{ display: 'flex', alignItems: 'center' }}>
          {editingId === tab.id ? (
            <input
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={() => {
                renameTab(tab.id, tempName);
                setEditingId(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  renameTab(tab.id, tempName);
                  setEditingId(null);
                }
              }}
              autoFocus
              style={{ width: 80 }}
            />
          ) : (
            <button
              onClick={() => setActiveTabId(tab.id)}
              onDoubleClick={() => {
                setEditingId(tab.id);
                setTempName(tab.name);
              }}
              style={{
                padding: '4px 8px',
                border: activeTabId === tab.id ? '2px solid #0077cc' : '1px solid #ccc',
                background: activeTabId === tab.id ? '#e0f0ff' : '#f4f4f4',
                cursor: 'pointer',
                fontWeight: activeTabId === tab.id ? 'bold' : 'normal'
              }}
            >
              {tab.name}
            </button>
          )}

          {tabs.length > 1 && (
            <button
              onClick={() => deleteTab(tab.id)}
              style={{ marginLeft: 4, color: 'red', cursor: 'pointer' }}
              title="Delete this tab"
            >
              🗑️
            </button>
          )}
        </div>
      ))}

      <button
        onClick={addTab}
        style={{
          padding: '4px 8px',
          background: '#dfffdc',
          border: '1px solid #ccc',
          cursor: 'pointer'
        }}
      >
        ➕ New Cut
      </button>
    </div>
  );
};
export default ClipTabs;
