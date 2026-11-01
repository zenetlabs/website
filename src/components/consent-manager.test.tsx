import { render } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ConsentManager } from '@/components/consent-manager';

it('renders nothing when analytics is not configured', () => {
  const { container } = render(<ConsentManager />);
  expect(container).toBeEmptyDOMElement();
});
