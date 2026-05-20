import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { CaliobaseUiConfigurationBuilder } from '../lib/CaliobaseUiConfiguration.builder';
import type { ICaliobaseApi } from '../lib/ICaliobaseApi';
import type { Constructor, ICaliobaseApiProps } from '../lib/types';
import { CaliobaseProviders } from './CaliobaseProviders';

jest.mock('react-router-dom', () => ({
  BrowserRouter: ({
    basename,
    children,
  }: {
    basename?: string;
    children: ReactNode;
  }) => (
    <div data-basename={basename ?? ''} data-testid="browser-router">
      {children}
    </div>
  ),
}));

jest.mock('use-async-effect-state', () => ({
  useAsyncEffectState: () => [undefined],
}));

jest.mock('../context/UserContext', () => ({
  UserContextProvider: ({ children }: { children: ReactNode }) => (
    <div data-testid="user-context">{children}</div>
  ),
}));

const TestApi = class {
  public readonly props: ICaliobaseApiProps;

  constructor(props: ICaliobaseApiProps) {
    this.props = props;
  }

  root = {
    getRoot: jest.fn(),
  };
} as unknown as Constructor<[ICaliobaseApiProps], ICaliobaseApi>;

describe('CaliobaseProviders', () => {
  it('mounts BrowserRouter at the configured UI base path', () => {
    const configuration = new CaliobaseUiConfigurationBuilder(TestApi, {
      baseUrl: '',
      frontEndBaseUrl: '',
      preferredLoginMethod: 'password',
      uiBasePath: '/cms/',
    }).build();

    render(
      <CaliobaseProviders configuration={configuration}>
        <div>CMS content</div>
      </CaliobaseProviders>
    );

    expect(
      screen.getByTestId('browser-router').getAttribute('data-basename')
    ).toBe('/cms');
    expect(screen.getByText('CMS content')).toBeTruthy();
  });

  it('keeps root-hosted apps at the default root basename', () => {
    const configuration = new CaliobaseUiConfigurationBuilder(TestApi, {
      baseUrl: '',
      frontEndBaseUrl: '',
      preferredLoginMethod: 'password',
    }).build();

    render(
      <CaliobaseProviders configuration={configuration}>
        <div>Root content</div>
      </CaliobaseProviders>
    );

    expect(
      screen.getByTestId('browser-router').getAttribute('data-basename')
    ).toBe('');
  });
});
