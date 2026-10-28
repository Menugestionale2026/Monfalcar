// Piccolo server locale che si comporta come l'app web di Google (script.google.com/macros/s/.../exec)
// ed esegue il VERO Code.gs con i servizi Google simulati. Serve per provare il sito vero contro il backend vero.
//   node google/tests/gas-server.mjs [porta]
// Come Google: la POST su /exec risponde con un reindirizzamento (302) a un indirizzo di "echo" che restituisce il JSON.
import http from 'node:http';
import { createEnv } from './gas-mock.mjs';

export async function startServer({ port = 8787, adminEmail = 'titolare@gmail.com', siteUrl = 'http://localhost:4173/', latencyMs = 0 } = {}) {
  const env = createEnv({ ownerEmail: adminEmail });
  env.resetNow();
  const setup = env.ctx.setup_({ adminEmail, adminName: 'Titolare', siteUrl });
  const echoes = new Map();
  let seq = 0;
  const log = [];

  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
  const wait = () => (latencyMs ? new Promise((r) => setTimeout(r, latencyMs)) : Promise.resolve());

  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://localhost');
    if (req.method === 'OPTIONS') {
      res.writeHead(204, cors).end();
      return;
    }
    if (req.method === 'POST' && u.pathname === '/exec') {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = Buffer.concat(chunks).toString('utf8');
      await wait();
      let out;
      try {
        out = env.ctx.doPost({ postData: { contents: body, type: req.headers['content-type'] } }).getContent();
      } catch (e) {
        out = JSON.stringify({ ok: false, e: 'unknown' });
      }
      try { const o = JSON.parse(out); log.push({ contentType: req.headers['content-type'], req: JSON.parse(body).a, ok: o.ok, e: o.e }); } catch { /* corpo non JSON */ }
      const id = String(++seq);
      echoes.set(id, out);
      res.writeHead(302, { ...cors, Location: `http://localhost:${port}/echo/${id}` }).end();
      return;
    }
    if (req.method === 'GET' && u.pathname.startsWith('/echo/')) {
      const out = echoes.get(u.pathname.slice(6));
      echoes.delete(u.pathname.slice(6));
      res.writeHead(out ? 200 : 404, { ...cors, 'Content-Type': 'application/json; charset=utf-8' }).end(out ?? '{}');
      return;
    }
    if (req.method === 'GET' && u.pathname === '/exec') {
      res.writeHead(200, { ...cors, 'Content-Type': 'application/json; charset=utf-8' }).end(env.ctx.doGet({}).getContent());
      return;
    }
    // ---- Aiuti per le prove (non esistono su Google) ----
    if (u.pathname === '/__test/outbox') {
      res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }).end(JSON.stringify(env.state.outbox));
      return;
    }
    if (u.pathname === '/__test/state') {
      const s = env.state;
      res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }).end(
        JSON.stringify({ files: s.files.map((f) => ({ id: f.id, trashed: !!f.trashed, sharing: f.sharing })), requests: log.length, formulaEvals: s.formulaEvals, outOfBounds: s.outOfBounds }),
      );
      return;
    }
    if (u.pathname === '/__test/dump') {
      res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }).end(JSON.stringify(env.dump(u.searchParams.get('sheet') || 'Auto')));
      return;
    }
    if (u.pathname === '/__test/log') {
      res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }).end(JSON.stringify(log));
      return;
    }
    res.writeHead(404, cors).end('non trovato');
  });

  await new Promise((r) => server.listen(port, r));
  return { server, env, url: `http://localhost:${port}/exec`, tempPassword: setup.tempPassword, adminEmail, close: () => new Promise((r) => server.close(r)) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.argv[2]) || 8787;
  const s = await startServer({ port });
  console.log(`App web simulata: ${s.url}`);
  console.log(`Accesso gestori: ${s.adminEmail}  password provvisoria: ${s.tempPassword}`);
}
