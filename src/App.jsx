import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import LayoutFrame from './components/LayoutFrame';
import ImportPage from './pages/ImportPage';
import ExportPage from './pages/ExportPage';

import EditLayout from './pages/Edit/EditLayout';
import CutPage from './pages/Edit/CutPage';
import CropPage from './pages/Edit/CropPage';
import CaptionPage from './pages/Edit/CaptionPage';

const App = () => (
  <AppProvider>
    <Router>
      <LayoutFrame>
        <Routes>
          <Route path="/" element={<ImportPage />} />
          <Route path="/export" element={<ExportPage />} />

          <Route path="/edit" element={<EditLayout />}>
            <Route path="cut" element={<CutPage />} />
            <Route path="crop" element={<CropPage />} />
            <Route path="caption" element={<CaptionPage />} />
          </Route>
        </Routes>
      </LayoutFrame>
    </Router>
  </AppProvider>
);

export default App;
