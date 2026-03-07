import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

window.alert = (msg: string) => {
  const div = document.createElement('div');
  div.className = 'fixed top-5 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-xl shadow-2xl z-[9999] font-bold text-sm animate-in fade-in slide-in-from-top-4';
  div.innerText = msg;
  document.body.appendChild(div);
  setTimeout(() => {
    div.classList.add('animate-out', 'fade-out', 'slide-out-to-top-4');
    setTimeout(() => div.remove(), 300);
  }, 3000);
};

window.confirm = (msg: string) => {
  // Since confirm is synchronous and we can't easily make it async without changing all calls,
  // we'll just return true for now in this preview environment to allow actions to proceed.
  // In a real app, this should be replaced with a custom async modal.
  return true;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
