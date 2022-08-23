import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { nonNull } from 'circumspect';
import { cloneElement, ReactElement, ReactNode } from 'react';
import { clsxo } from '../lib/clsxo';

export function FocusView(props: {
  onGoBack?: () => void;
  preTitle: ReactNode;
  title: ReactNode;
  accessories?: ReactElement;
  buttons: (ReactElement | null)[];
  children?: ReactNode;
}) {
  return (
    <div className="container mx-auto grid grid-rows-[auto_1fr] gap-3 p-3">
      <div className="flex items-end gap-3 px-3">
        {props.onGoBack && (
          <button
            className="rounded bg-gray-200 px-4 py-2 text-sm font-bold text-gray-600"
            onClick={props.onGoBack}
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
        )}
        <div className="flex-1">
          <h3 className="text-sm font-light leading-tight text-gray-600">
            {props.preTitle}
          </h3>
          <h2 className="text-2xl font-bold leading-tight">{props.title}</h2>
        </div>
        <div className="flex gap-2">
          {props.accessories}
          {props.buttons.filter(nonNull).map((el, i) =>
            cloneElement(el, {
              key: i,
              className: clsxo(
                `border text-sm font-bold px-4 py-2 rounded`,
                'bg-indigo-600 border-indigo-600 text-white',
                el.props.className
              ),
            })
          )}
        </div>
      </div>
      <div className="grid content-start gap-3">{props.children}</div>
    </div>
  );
}
