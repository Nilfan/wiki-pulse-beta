export function getTwoDigits(num: number) {
  return `${num}`.length < 2 ? `0${num}` : `${num}`;
}

export function getTime(date: Date) {
  return `${getTwoDigits(date.getHours())}:${getTwoDigits(date.getMinutes())}:${getTwoDigits(date.getSeconds())} ${getTwoDigits(date.getDate())}/${getTwoDigits(date.getMonth())}/${date.getFullYear()}`;
}

export function getCurrentTime() {
  const date = new Date();

  return getTime(date);
}

function getLogPrefix() {
  return `${getCurrentTime()} [WikiSourceService]`;
}

export function getErrorText(text: string) {
  return `${getLogPrefix()} ${text}`;
}

export function log(text: string) {
  console.log(`${getLogPrefix()} ${text}`);
}

export function error(text: string, additional: unknown) {
  console.error(`${getLogPrefix()} ${text}`, additional);
}
