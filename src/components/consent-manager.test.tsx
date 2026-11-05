import { render } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ConsentManager } from '@/components/consent-manager';

vi.hoisted(() => {
  vi.stubGlobal('__GA4_ID__', null);
});

it('renders nothing when analytics is not configured', () => {
  const { container } = render(<ConsentManager />);
  expect(container).toBeEmptyDOMElement();
});
