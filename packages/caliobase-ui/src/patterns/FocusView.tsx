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
    <div className="container mx-auto flex flex-col gap-3">
      <div className="sticky top-0 flex items-end gap-3 bg-gray-100 p-3 pl-14 md:pl-6 lg:pl-3">
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
      <div className="grid content-start gap-3 px-3">{props.children}</div>
    </div>
  );
}
