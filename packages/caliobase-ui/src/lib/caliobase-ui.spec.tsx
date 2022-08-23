import { render } from '@testing-library/react';

import CaliobaseUi from './caliobase-ui';

describe('CaliobaseUi', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<CaliobaseUi />);
    expect(baseElement).toBeTruthy();
  });
});
