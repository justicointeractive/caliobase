import { clsx } from 'clsx';
import { overrideTailwindClasses } from 'tailwind-override';

export const clsxo = (...args: Parameters<typeof clsx>) =>
  overrideTailwindClasses(clsx(...args));
