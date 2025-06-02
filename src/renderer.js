import React from 'react';
import { createRoot } from 'react-dom/client';

const App = () => {
  return (
    <div style={{ padding: 40 }}>
      <h1>🧙 Welcome to ClipWizard</h1>
      <button onClick={() => alert('Summon video picker soon!')}>Summon Video</button>
    </div>
  );
};

const container = document.getElementById('app');
const root = createRoot(container);
root.render(<App />);
