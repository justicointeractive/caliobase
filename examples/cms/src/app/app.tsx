import {
  CaliobaseUI,
  CaliobaseUiConfigurationBuilder,
} from '@caliobase/caliobase-ui';
import { Api } from '@caliobase/examples-client';

const appConfig = new CaliobaseUiConfigurationBuilder(Api, {
  baseUrl: '',
  frontEndBaseUrl: '',
  preferredLoginMethod: 'password',
}).build();

export function App() {
  return <CaliobaseUI configuration={appConfig} routes={[]} />;
}

export default App;
