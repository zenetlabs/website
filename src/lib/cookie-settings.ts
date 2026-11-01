export const COOKIE_SETTINGS_ID = 'cookie-settings';

export function openCookieSettings(): boolean {
  const dialog = document.getElementById(COOKIE_SETTINGS_ID);
  if (!(dialog instanceof HTMLDialogElement)) return false;
  if (!dialog.open) dialog.showModal();
  return true;
}
