import {
  faCheckCircle,
  faCircleNotch,
  faExclamationCircle,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx';
import {
  HTMLInputTypeAttribute,
  MouseEvent,
  ReactNode,
  useCallback,
  useState,
} from 'react';
import { clsxo } from '../lib/clsxo';
import { CancelationError } from './CancelationError';

export type ResultStatus = 'success' | 'fail' | 'cancel';

export const PendingButton = (props: {
  type?: HTMLInputTypeAttribute;
  children?: ReactNode;
  className?: string;
  onClick: () => Promise<void>;
  role?: 'destroy';
}) => {
  const [isPending, setIsPending] = useState(false);

  const [result, setResult] = useState<ResultStatus | null>(null);

  const setTemporaryStatus = useCallback((status: ResultStatus) => {
    setResult(status);
    setTimeout(() => {
      setResult(null);
    }, 750);
  }, []);

  const handlePendingClick = useCallback(
    async (e: MouseEvent) => {
      e.preventDefault();
      try {
        setIsPending(true);
        await props.onClick();
        setTemporaryStatus('success');
      } catch (err) {
        console.error(err);

        setTemporaryStatus(err instanceof CancelationError ? 'cancel' : 'fail');
      } finally {
        setIsPending(false);
      }
    },
    [props, setTemporaryStatus]
  );

  return (
    <button
      className={clsxo(
        'relative',
        props.className,
        result === 'success' && 'border-green-600 bg-green-600 text-white',
        result === 'fail' && 'border-red-600 bg-red-600 text-white',
        result === 'cancel' && 'border-gray-600 bg-gray-600 text-white'
      )}
      onClick={handlePendingClick}
      disabled={isPending || result != null}
    >
      <div className={clsx(isPending || result ? 'opacity-10' : 'opacity-100')}>
        {props.children}
      </div>
      {isPending && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <FontAwesomeIcon icon={faCircleNotch} spin size="lg" />
        </div>
      )}
      {result === 'success' && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <FontAwesomeIcon icon={faCheckCircle} size="lg" />
        </div>
      )}
      {result === 'fail' && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <FontAwesomeIcon icon={faExclamationCircle} size="lg" />
        </div>
      )}
      {result === 'cancel' && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <FontAwesomeIcon icon={faXmark} size="lg" />
        </div>
      )}
    </button>
  );
};
