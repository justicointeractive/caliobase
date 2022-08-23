import { format, parse } from 'date-fns';

const localDateTimeFormat = "yyyy-MM-dd'T'HH:mm";
const localDateFormat = 'yyyy-MM-dd';

export function formatDateTimeLocal(date: Date) {
  return format(date, localDateTimeFormat);
}

export function parseDateTimeLocal(dateString: string) {
  return parse(dateString, localDateTimeFormat, new Date(0));
}

export function formatDateLocal(date: Date) {
  return format(date, localDateFormat);
}

export function parseDateLocal(dateString: string) {
  return parse(dateString, localDateFormat, new Date(0));
}
