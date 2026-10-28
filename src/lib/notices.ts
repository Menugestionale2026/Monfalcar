/** Avvisi che restano visibili anche se la pagina cambia (es. "l'email al cliente non è partita"). */
export const ADMIN_NOTICE_EVENT = 'mf-admin-notice';

export function pushAdminNotice(text: string): void {
  window.dispatchEvent(new CustomEvent<string>(ADMIN_NOTICE_EVENT, { detail: text }));
}
