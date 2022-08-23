import { faCircleNotch } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { clsxo } from '../lib/clsxo';

export function FullScreenLoader(props: { spinnerClassName?: string }) {
  return (
    <div className="grid min-h-screen items-center justify-center bg-gray-200">
      <Loader className={props.spinnerClassName} />
    </div>
  );
}

export function FullHeightLoader(props: {
  className?: string;
  spinnerClassName?: string;
}) {
  return (
    <div
      className={clsxo(
        'grid min-h-full items-center justify-center',
        props.className
      )}
    >
      <Loader className={props.spinnerClassName} />
    </div>
  );
}

export function Loader(props: { className?: string }) {
  return (
    <FontAwesomeIcon
      className={clsxo('h-12 w-12 text-indigo-700', props.className)}
      icon={faCircleNotch}
      spin
    />
  );
}
