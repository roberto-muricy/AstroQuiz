import React, { Suspense } from "react";
import './i18n'; // Certifique-se que esse arquivo existe
import ReactDOM from "react-dom/client";
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Suspense fallback={<div>Loading...</div>}>
    <App />
  </Suspense>
);

// Suprimir aviso do React DevTools em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  const originalError = console.error;
  console.error = (...args) => {
    if (args[0]?.includes?.('Download the React DevTools')) {
      return;
    }
    originalError.apply(console, args);
  };
}

reportWebVitals();
