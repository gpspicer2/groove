import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Tapping into a number field selects its contents app-wide, so typing
// replaces the value instead of appending to it.
document.addEventListener('focusin', (e) => {
  if (e.target instanceof HTMLInputElement && e.target.type === 'number') e.target.select();
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
