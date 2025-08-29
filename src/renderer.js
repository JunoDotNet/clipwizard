import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App'; // this should point to your full App.jsx

const container = document.getElementById('app');
const root = createRoot(container);
root.render(<App />);
