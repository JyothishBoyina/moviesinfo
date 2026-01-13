import React from 'react';
import ReactDOM from 'react-dom';
import './styles.css';

// Import the main app script
import './app.js';

// Render a simple root div - the app.js script will handle DOM manipulation
ReactDOM.render(
  <React.StrictMode>
    <div id="root"></div>
  </React.StrictMode>,
  document.getElementById('root')
);
