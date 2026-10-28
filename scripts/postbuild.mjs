// GitHub Pages non conosce le rotte dell'app (es. /auto/123): per ogni indirizzo
// sconosciuto serve 404.html. Copiando index.html in 404.html l'app si carica
// comunque e il router mostra la pagina giusta.
import { copyFileSync, existsSync } from 'node:fs';

const index = 'dist/index.html';
if (!existsSync(index)) {
  console.error('dist/index.html non trovato: esegui prima "vite build".');
  process.exit(1);
}
copyFileSync(index, 'dist/404.html');
console.log('Creato dist/404.html per le rotte dell\'app su GitHub Pages.');
