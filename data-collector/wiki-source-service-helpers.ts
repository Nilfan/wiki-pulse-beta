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

export function log(text: string) {
  console.log(`${getCurrentTime()} [WikiSourceService] ${text}`);
}

export function error(text: string, additional: unknown) {
  console.error(`${getCurrentTime()} [WikiSourceService] ${text}`, additional);
}

export function getErrorText(text: string) {
  return `${getCurrentTime()} [WikiSourceService] ${text}`;
}
