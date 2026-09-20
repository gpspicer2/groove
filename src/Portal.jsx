import { createPortal } from 'react-dom';

// Full-screen modals need to render outside SwipeTabs' sliding container.
// That container has a CSS transform on it (for the slide animation),
// and a transform on an ancestor redefines the containing block for any
// `position: fixed` descendant — so a modal meant to cover the whole
// viewport instead gets clipped to that (overflow: hidden) ancestor's
// bounds. Rendering into document.body sidesteps the problem entirely.
export default function Portal({ children }) {
  return createPortal(children, document.body);
}
