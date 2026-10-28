import { useEffect } from 'react';
import { business } from '../config/business';

/** Imposta titolo e descrizione della pagina (utile per Google e per le schede del browser). */
export function usePageMeta(title: string | null, description?: string, noindex = false): void {
  useEffect(() => {
    document.title = title ? `${title} | ${business.name}` : `${business.name} - Officina, auto e noleggio`;

    const setMeta = (name: string, content: string | null) => {
      let tag = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (content === null) {
        tag?.remove();
        return;
      }
      if (!tag) {
        tag = document.createElement('meta');
        tag.name = name;
        document.head.appendChild(tag);
      }
      tag.content = content;
    };

    if (description) setMeta('description', description);
    setMeta('robots', noindex ? 'noindex, nofollow' : null);
  }, [title, description, noindex]);
}
