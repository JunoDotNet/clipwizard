import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

const EditLayout = () => {
  const { pathname } = useLocation();
  
  // Check if Cut page is active (either /edit/cut or just /edit as index route)
  const isCutActive = pathname === '/edit' || pathname.includes('/cut');

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <Link to="/edit/cut">
          <button style={{ fontWeight: isCutActive ? 'bold' : 'normal' }}>✂️ Cut</button>
        </Link>
        <Link to="/edit/crop">
          <button style={{ fontWeight: pathname.includes('/crop') ? 'bold' : 'normal' }}>📐 Crop</button>
        </Link>
        <Link to="/edit/caption">
          <button style={{ fontWeight: pathname.includes('/caption') ? 'bold' : 'normal' }}>💬 Caption</button>
        </Link>
      </div>
      <Outlet />
    </div>
  );
};

export default EditLayout;
