import { CancelationError } from '../components/CancelationError';

export function promisePopup<T>(url: string) {
  return new Promise<T>((resolve, reject) => {
    const popupWindow = popupCenter(url, '', 700, 580);

    function disposeWindow() {
      popupWindow?.close();
      clearInterval(popupClosedInterval);
    }

    window.addEventListener('message', (message) => {
      if (message.source !== popupWindow) {
        return;
      }
      const { type, data } = message.data;
      switch (type) {
        case 'resolve':
          resolve(data);
          disposeWindow();
          break;
        case 'reject':
          reject(data);
          disposeWindow();
          break;
      }
    });

    const popupClosedInterval = setInterval(() => {
      if (popupWindow?.closed) {
        reject(new CancelationError('window closed with no result'));
        disposeWindow();
      }
    }, 1000);
  });
}

function popupCenter(url: string, title: string, w: number, h: number) {
  const userAgent = navigator.userAgent;
  const mobile = (() => {
    return (
      /\b(iPhone|iP[ao]d)/.test(userAgent) ||
      /\b(iP[ao]d)/.test(userAgent) ||
      /Android/i.test(userAgent) ||
      /Mobile/i.test(userAgent)
    );
  })();
  const screenX = window.screenX != null ? window.screenX : window.screenLeft;
  const screenY = window.screenY != null ? window.screenY : window.screenTop;
  const outerWidth =
    window.outerWidth != null
      ? window.outerWidth
      : document.documentElement.clientWidth;
  const outerHeight =
    window.outerHeight != null
      ? window.outerHeight
      : document.documentElement.clientHeight - 22;

  const targetWidth = mobile ? null : w;
  const targetHeight = mobile ? null : h;

  const V = screenX < 0 ? window.screen.width + screenX : screenX;
  const left = Math.floor(V + (outerWidth - (targetWidth ?? 0)) / 2);
  const right = Math.floor(screenY + (outerHeight - (targetHeight ?? 0)) / 2.5);

  const features = [];

  if (targetWidth !== null) {
    features.push('width=' + targetWidth);
  }
  if (targetHeight !== null) {
    features.push('height=' + targetHeight);
  }
  features.push('left=' + left);
  features.push('top=' + right);
  features.push('scrollbars=1');

  const newWindow = window.open(url, title, features.join(','));

  if (newWindow && newWindow.focus) {
    newWindow.focus();
  }

  return newWindow;
}
