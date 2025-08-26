import React from 'react';

const SelectedCutList = ({ tabs, selectedIds, toggleTab }) => {
  return (
    <div>
      <h4 style={{ marginBottom: 10 }}>📦 Export Selection</h4>
      {tabs.length === 0 ? (
        <p style={{ fontSize: 13, color: '#777' }}>No cuts available.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {tabs.map(tab => {
            const isSelected = selectedIds.includes(tab.id);
            return (
              <li key={tab.id} style={{ marginBottom: 6 }}>
                <label style={{ 
                  fontSize: 13, 
                  display: 'flex', 
                  alignItems: 'center',
                  opacity: isSelected ? 1 : 0.6,
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleTab(tab.id)}
                    style={{ marginRight: 8 }}
                  />
                  <span style={{ 
                    color: isSelected ? 'inherit' : '#888'
                  }}>
                    {tab.name} ({tab.clips.length} clip{tab.clips.length !== 1 ? 's' : ''})
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      <div style={{ 
        marginTop: 10, 
        padding: 8, 
        background: '#f8f9fa', 
        borderRadius: 4, 
        fontSize: 12, 
        color: '#666' 
      }}>
        {selectedIds.length} of {tabs.length} cuts selected for export
      </div>
    </div>
  );
};

export default SelectedCutList;
