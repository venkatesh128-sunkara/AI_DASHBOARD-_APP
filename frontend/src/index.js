import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // or './App'

const container = document.getElementById('root');

if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("Failed to find the root element. Check frontend/public/index.html for <div id='root'></div>");
}