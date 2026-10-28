import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { eur, kmText } from '../lib/format';
import type { Car } from '../types';
import { CarArt } from './CarArt';
import { CarStatusBadge, ServiceBadges } from './Badge';

export function CarPhoto({ car, className = '' }: { car: Pick<Car, 'photos' | 'title'>; className?: string }) {
  const first = car.photos[0];
  return (
    <div className={`relative flex items-center justify-center overflow-hidden bg-brand-soft ${className}`}>
      {first ? (
        <img src={api.photoUrl(first, 640)} alt={car.title} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <CarArt />
      )}
    </div>
  );
}

export function priceLine(car: Car): { main: string; sub: string | null } {
  const sale = car.service_type !== 'noleggio' && car.price !== null;
  const rent = car.service_type !== 'vendita' && car.rate_day !== null;
  if (sale && rent) return { main: eur(car.price), sub: `oppure noleggio da ${eur(car.rate_day)}/giorno` };
  if (sale) return { main: eur(car.price), sub: null };
  if (rent) return { main: `da ${eur(car.rate_day)}/giorno`, sub: null };
  return { main: 'Prezzo su richiesta', sub: null };
}

export function CarCard({ car }: { car: Car }) {
  const price = priceLine(car);
  const meta = [car.year, car.km !== null ? kmText(car.km) : null, car.fuel].filter(Boolean).join(' · ');
  const sold = car.status === 'venduta';
  return (
    <Link
      to={`/auto/${car.id}`}
      className="card group flex h-full flex-col overflow-hidden no-underline transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative">
        <CarPhoto car={car} className="aspect-[4/3]" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <ServiceBadges car={car} />
        </div>
        <div className="absolute bottom-3 left-3">
          <CarStatusBadge status={car.status} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-lg font-semibold leading-snug">{car.title}</h3>
        {meta && <p className="mt-1 text-[15px] text-brand-muted">{meta}</p>}
        <div className="mt-auto pt-4">
          <p className={`font-display text-2xl font-bold ${sold ? 'text-brand-muted line-through' : 'text-brand-blue'}`}>
            {price.main}
          </p>
          {price.sub && <p className="text-sm text-brand-muted">{price.sub}</p>}
        </div>
      </div>
    </Link>
  );
}
