import React from 'react';
import { Link } from 'react-router-dom';

const EditIndex = () => {
  return (
    <div style={{ padding: 20 }}>
      <h2>🛠 Edit Workflow</h2>
      <nav style={{ display: 'flex', gap: 20 }}>
        <Link to="/edit/cut">✂️ Cut</Link>
        <Link to="/edit/crop">📐 Crop</Link>
        <Link to="/edit/caption">💬 Caption</Link>
      </nav>
    </div>
  );
};

export default EditIndex;
