import { business } from '../config/business';
import logoBlue from '../assets/logo.png';
import logoWhite from '../assets/logo-white.png';

/**
 * Logo MONFALCAR (immagine con sfondo trasparente). `light` = versione bianca per gli sfondi scuri.
 * `size` = altezza in pixel; senza `size` il logo si adatta (più piccolo sul telefono).
 */
export function Logo({ light = false, size }: { light?: boolean; size?: number }) {
  return (
    <img
      src={light ? logoWhite : logoBlue}
      alt={`${business.name} autofficina`}
      width={560}
      height={115}
      className={`block w-auto max-w-full ${size ? '' : 'h-8 sm:h-10'}`}
      style={size ? { height: size } : undefined}
    />
  );
}
