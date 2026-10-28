import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from './api';
import { business } from '../config/business';
import { phoneDigits } from './phone';
import type { SiteInfo } from '../types';

interface SiteInfoState {
  info: SiteInfo | null;
  reload: () => void;
}

const SiteInfoContext = createContext<SiteInfoState>({ info: null, reload: () => undefined });

/** Carica telefono, indirizzo ecc. salvati dai gestori. Finché non arrivano (o se mancano) valgono quelli di src/config/business.ts. */
export function SiteInfoProvider({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<SiteInfo | null>(null);

  const reload = useCallback(() => {
    api
      .getSiteInfo()
      .then(setInfo)
      .catch(() => setInfo(null));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const value = useMemo(() => ({ info, reload }), [info, reload]);
  return <SiteInfoContext.Provider value={value}>{children}</SiteInfoContext.Provider>;
}

export function useReloadSiteInfo(): () => void {
  return useContext(SiteInfoContext).reload;
}

/** Dati salvati dai gestori (o null se non ce ne sono): serve alla pagina di modifica. */
export function useSavedSiteInfo(): SiteInfo | null {
  return useContext(SiteInfoContext).info;
}

const pick = (value: string | undefined, fallback: string): string => (value && value.trim() ? value.trim() : fallback);

/** I dati dell'attività da mostrare sul sito: quelli dei gestori, con i valori di riserva dove mancano. */
export function useBusiness() {
  const { info } = useContext(SiteInfoContext);
  return useMemo(() => {
    const phone = pick(info?.phone, business.phone);
    const digits = phoneDigits(info?.phone);
    const phoneLink = digits ? `+${digits}` : info?.phone?.trim() ? '' : business.phoneLink;
    const wa = phoneDigits(info?.whatsapp) ?? business.whatsapp;
    const lat = info?.map_lat ?? business.map.lat;
    const lon = info?.map_lon ?? business.map.lon;
    return {
      name: business.name,
      tagline: business.tagline,
      phone,
      email: pick(info?.email, business.email),
      address: pick(info?.address, business.address),
      city: pick(info?.city, business.city),
      vat: pick(info?.vat, business.vat),
      replyTime: pick(info?.reply_time, business.replyTime),
      map: { lat, lon },
      /** Link "Chiama": undefined finché non c'è un numero valido */
      phoneHref: phoneLink ? `tel:${phoneLink}` : undefined,
      whatsappHref: (text?: string): string | undefined =>
        wa ? `https://wa.me/${wa}${text ? `?text=${encodeURIComponent(text)}` : ''}` : undefined,
    };
  }, [info]);
}
