import type { BookingStatus, Car, CarStatus } from '../types';

const base = 'inline-flex items-center rounded-full px-3 py-1 text-[13px] font-semibold leading-none';

export function ServiceBadges({ car }: { car: Pick<Car, 'service_type'> }) {
  const sale = car.service_type === 'vendita' || car.service_type === 'entrambi';
  const rent = car.service_type === 'noleggio' || car.service_type === 'entrambi';
  return (
    <>
      {sale && <span className={`${base} bg-brand-blue text-white`}>Vendita</span>}
      {rent && <span className={`${base} bg-brand-yellow text-brand-navy`}>Noleggio</span>}
    </>
  );
}

export const CAR_STATUS_LABEL: Record<CarStatus, string> = {
  disponibile: 'Disponibile',
  venduta: 'Venduta',
  a_noleggio: 'A noleggio ora',
  non_disponibile: 'Non disponibile',
};

export function CarStatusBadge({ status }: { status: CarStatus }) {
  if (status === 'disponibile') return null;
  const tone =
    status === 'venduta'
      ? 'bg-brand-navy text-white'
      : status === 'a_noleggio'
        ? 'bg-white text-brand-navy border border-brand-line'
        : 'bg-brand-muted text-white';
  return <span className={`${base} ${tone}`}>{CAR_STATUS_LABEL[status]}</span>;
}

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  in_attesa: 'In attesa',
  confermata: 'Confermata',
  rifiutata: 'Rifiutata',
  completata: 'Completata',
  annullata: 'Annullata',
};

const BOOKING_TONE: Record<BookingStatus, string> = {
  in_attesa: 'bg-brand-yellow text-brand-navy',
  confermata: 'bg-[#DDF3E4] text-[#14532D]',
  rifiutata: 'bg-[#FDE4E1] text-[#8A1C13]',
  completata: 'bg-brand-soft text-brand-blue',
  annullata: 'bg-[#E9ECF2] text-brand-ink',
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <span className={`${base} ${BOOKING_TONE[status]}`}>{BOOKING_STATUS_LABEL[status]}</span>;
}
