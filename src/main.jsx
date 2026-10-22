import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Tapping into a number field selects its contents app-wide, so typing
// replaces the value instead of appending to it.
document.addEventListener('focusin', (e) => {
  if (e.target instanceof HTMLInputElement && e.target.type === 'number') e.target.select();
});

// Keep the phone from offering saved-info suggestions above the keyboard on workout and note fields.
// Sign-in fields (email, password) are left alone so password managers still work.
function quietField(el) {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
  if (['email', 'password'].includes(el.type) || el.dataset.keepAutofill) return;
  el.setAttribute('autocomplete', 'off');
  // Writing boxes (Q&A, journal, notes) keep the phone's autocorrect, "i'm" -> "I'm" and capital letters;
  // short name / number fields stay plain so they aren't "fixed" into the wrong word.
  if (el instanceof HTMLTextAreaElement) {
    if (!el.hasAttribute('autocapitalize')) el.setAttribute('autocapitalize', 'sentences');
    el.setAttribute('autocorrect', 'on');
    el.spellcheck = true;
  } else {
    el.setAttribute('autocorrect', 'off');
  }
  el.setAttribute('data-lpignore', 'true');
  el.setAttribute('data-form-type', 'other');
  if (!el.hasAttribute('name')) el.setAttribute('name', `f-${Math.random().toString(36).slice(2, 8)}`);
}
function quietTree(node) {
  if (!(node instanceof Element)) return;
  quietField(node);
  node.querySelectorAll && node.querySelectorAll('input, textarea').forEach(quietField);
}
quietTree(document.body);
new MutationObserver((list) => list.forEach((m) => m.addedNodes.forEach(quietTree))).observe(document.body, { childList: true, subtree: true });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
