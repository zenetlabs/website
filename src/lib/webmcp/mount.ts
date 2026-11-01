import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { WebMcpBookingDialog } from '@/components/webmcp-booking-dialog';
import type { MountDialog } from '@/lib/webmcp/confirmation';

// Its own React root on an appended node: the dialog needs no router context.
export const mountDialog: MountDialog = (request) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  root.render(createElement(WebMcpBookingDialog, { request }));
  return () => {
    queueMicrotask(() => {
      root.unmount();
      container.remove();
    });
  };
};
