import { createElement } from 'react';
import { useApiContext } from '../context/ApiContext';
import { useUserContext } from '../context/UserContext';

export function Branding(props: { className?: string }) {
  const { caliobaseUiConfiguration } = useApiContext();
  const { user } = useUserContext();

  const baseComponent = caliobaseUiConfiguration.brandingComponent
    ? createElement(caliobaseUiConfiguration.brandingComponent, {
        organization: user?.organization,
        className: props.className,
      })
    : null;

  return baseComponent;
}
