import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import LayoutFrame from './components/LayoutFrame';
import ImportPage from './pages/ImportPage';
import EditPage from './pages/EditPage';
import ExportPage from './pages/ExportPage';

const App = () => (
  <AppProvider>
    <Router>
      <LayoutFrame>
        <Routes>
          <Route path="/" element={<ImportPage />} />
          <Route path="/edit" element={<EditPage />} />
          <Route path="/export" element={<ExportPage />} />
        </Routes>
      </LayoutFrame>
    </Router>
  </AppProvider>
);

export default App;
