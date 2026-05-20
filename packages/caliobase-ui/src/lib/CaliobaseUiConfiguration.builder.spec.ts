import { CaliobaseUiConfigurationBuilder } from './CaliobaseUiConfiguration.builder';
import type { ICaliobaseApi } from './ICaliobaseApi';
import type { Constructor, ICaliobaseApiProps } from './types';

const TestApi = class {
  public readonly props: ICaliobaseApiProps;

  constructor(props: ICaliobaseApiProps) {
    this.props = props;
  }
} as unknown as Constructor<[ICaliobaseApiProps], ICaliobaseApi>;

describe('CaliobaseUiConfigurationBuilder', () => {
  it.each([
    [undefined, undefined],
    ['', undefined],
    ['/', undefined],
    ['cms', '/cms'],
    ['/cms', '/cms'],
    ['/cms/', '/cms'],
    ['cms/admin/', '/cms/admin'],
  ])('normalizes uiBasePath %p to %p', (input, expected) => {
    const configuration = new CaliobaseUiConfigurationBuilder(TestApi, {
      baseUrl: '',
      frontEndBaseUrl: '',
      preferredLoginMethod: 'password',
      ...(input == null ? {} : { uiBasePath: input }),
    }).build();

    expect(configuration.uiBasePath).toBe(expected);
  });

  it('builds UI-relative paths and URLs with the mount prefix', () => {
    const configuration = new CaliobaseUiConfigurationBuilder(TestApi, {
      baseUrl: '',
      frontEndBaseUrl: '',
      preferredLoginMethod: 'password',
      uiBasePath: '/cms',
    }).build();

    expect(configuration.createUiPath('/invitation?token=abc')).toBe(
      '/cms/invitation?token=abc'
    );
    expect(
      configuration.createUiUrl(
        '/invitation?token=abc',
        'https://example.test/cms/users'
      )
    ).toBe('https://example.test/cms/invitation?token=abc');
  });
});
