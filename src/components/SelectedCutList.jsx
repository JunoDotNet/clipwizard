import React from 'react';

const SelectedCutList = ({ tabs, selectedIds, toggleTab }) => {
  const selectedTabs = tabs.filter(tab => selectedIds.includes(tab.id));

  return (
    <div>
      <h4 style={{ marginBottom: 10 }}>✅ Included Cuts</h4>
      {selectedTabs.length === 0 ? (
        <p style={{ fontSize: 13, color: '#777' }}>No cuts selected.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {selectedTabs.map(tab => (
            <li key={tab.id} style={{ marginBottom: 6 }}>
              <label style={{ fontSize: 13, display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked
                  onChange={() => toggleTab(tab.id)}
                  style={{ marginRight: 8 }}
                />
                {tab.name}
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SelectedCutList;
