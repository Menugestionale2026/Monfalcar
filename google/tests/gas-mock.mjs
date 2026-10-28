// Simulatore dei servizi Google usati da Code.gs (Fogli, Drive, Gmail, blocchi, trigger, interfaccia).
// Serve solo ai test: riproduce anche i comportamenti "scomodi" dei Fogli veri, per scoprire gli errori
// prima di metterli online:
//  - le celle NON in formato testo convertono numeri, orari e date e valutano le formule;
//  - scrivere fuori dalle dimensioni del foglio è un errore;
//  - setValues deve avere esattamente le dimensioni dell'intervallo;
//  - il blocco (LockService) non si può prendere due volte.
import vm from 'node:vm';
import fs from 'node:fs';
import crypto from 'node:crypto';

const CODE = new URL('../Code.gs', import.meta.url);

export function createEnv({ ownerEmail = 'titolare@gmail.com' } = {}) {
  const state = {
    sheets: [],
    props: {},
    outbox: [],
    mailQuota: 100,
    mailSent: 0,
    mailFail: null,
    files: [],
    folders: [],
    triggers: [],
    lockHeld: false,
    lockAcquisitions: 0,
    webAppUrl: 'https://script.google.com/macros/s/AKfycbxEXAMPLE/exec',
    ownerEmail,
    prompts: [],
    promptLog: [],
    alerts: [],
    menus: [],
    consoleErrors: [],
    consoleWarnings: [],
    formulaEvals: 0,
    outOfBounds: 0,
  };

  const ctx = vm.createContext({});
  const D = vm.runInContext('Date', ctx);

  // ---------- Fogli ----------
  class Range {
    constructor(sheet, r, c, nr, nc) {
      if (r < 1 || c < 1 || nr < 1 || nc < 1 || r + nr - 1 > sheet.maxRows || c + nc - 1 > sheet.maxCols) {
        state.outOfBounds++;
        throw new Error('The coordinates of the range are outside the dimensions of the sheet.');
      }
      Object.assign(this, { sheet, r, c, nr, nc });
    }
    getValues() {
      const out = [];
      for (let i = 0; i < this.nr; i++) {
        const row = [];
        for (let j = 0; j < this.nc; j++) row.push(this.sheet.get(this.r + i, this.c + j));
        out.push(row);
      }
      return out;
    }
    setValues(vals) {
      if (!Array.isArray(vals) || vals.length !== this.nr || vals.some((row) => !Array.isArray(row) || row.length !== this.nc)) {
        throw new Error(`The number of rows or columns in the data does not match the number in the range (${this.nr}x${this.nc}).`);
      }
      for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) this.sheet.put(this.r + i, this.c + j, vals[i][j]);
      return this;
    }
    setValue(v) {
      return this.setValues(Array.from({ length: this.nr }, () => Array.from({ length: this.nc }, () => v)));
    }
    getValue() {
      return this.sheet.get(this.r, this.c);
    }
    setNumberFormat(f) {
      for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) this.sheet.fmt.set(`${this.r + i},${this.c + j}`, f);
      return this;
    }
    setFontWeight() { return this; }
    setBackground() { return this; }
    setFontColor() { return this; }
    clearContent() {
      for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) this.sheet.cells.delete(`${this.r + i},${this.c + j}`);
      return this;
    }
  }

  class Sheet {
    constructor(name) {
      this.name = name;
      this.maxRows = 1000;
      this.maxCols = 26;
      this.cells = new Map();
      this.fmt = new Map();
      this.hidden = false;
      this.frozen = 0;
    }
    getName() { return this.name; }
    get(r, c) {
      const v = this.cells.get(`${r},${c}`);
      return v === undefined ? '' : v;
    }
    put(r, c, v) {
      const text = this.fmt.get(`${r},${c}`) === '@';
      if (v === null || v === undefined) v = '';
      if (text) {
        this.cells.set(`${r},${c}`, String(v));
        return;
      }
      // comportamento di un foglio con formato "Automatico"
      if (typeof v === 'string') {
        if (v.startsWith('=')) {
          state.formulaEvals++;
          v = '#ERROR!';
        } else if (/^-?\d+([.,]\d+)?$/.test(v)) {
          v = Number(v.replace(',', '.'));
        } else if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(v)) {
          const [h, m] = v.split(':').map(Number);
          v = new D(Date.UTC(1899, 11, 30, h, m));
        } else if (/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}(:\d{2})?)?$/.test(v)) {
          v = new D(v.replace(' ', 'T') + (v.length > 10 ? '' : 'T00:00') + 'Z');
        }
      }
      this.cells.set(`${r},${c}`, v);
    }
    getMaxRows() { return this.maxRows; }
    getMaxColumns() { return this.maxCols; }
    insertRowsAfter(pos, n) { this.maxRows += n; }
    insertColumnsAfter(pos, n) { this.maxCols += n; }
    getLastRow() {
      let last = 0;
      for (const [k, v] of this.cells) if (v !== '') last = Math.max(last, Number(k.split(',')[0]));
      return last;
    }
    getLastColumn() {
      let last = 0;
      for (const [k, v] of this.cells) if (v !== '') last = Math.max(last, Number(k.split(',')[1]));
      return last;
    }
    getRange(r, c, nr = 1, nc = 1) { return new Range(this, r, c, nr, nc); }
    getDataRange() { return new Range(this, 1, 1, Math.max(this.getLastRow(), 1), Math.max(this.getLastColumn(), 1)); }
    deleteRows(start, n) {
      if (this.maxRows - n < 2) throw new Error("You can't delete all the rows on the sheet.");
      const moved = new Map();
      const movedFmt = new Map();
      for (const [k, v] of this.cells) {
        const [r, c] = k.split(',').map(Number);
        if (r >= start && r < start + n) continue;
        moved.set(`${r >= start + n ? r - n : r},${c}`, v);
      }
      for (const [k, v] of this.fmt) {
        const [r, c] = k.split(',').map(Number);
        if (r >= start && r < start + n) continue;
        movedFmt.set(`${r >= start + n ? r - n : r},${c}`, v);
      }
      this.cells = moved;
      this.fmt = movedFmt;
      this.maxRows -= n;
    }
    deleteRow(r) { this.deleteRows(r, 1); }
    setFrozenRows(n) { this.frozen = n; }
    hideSheet() { this.hidden = true; }
  }

  class Spreadsheet {
    getId() { return 'mock-spreadsheet-id'; }
    getSheets() { return state.sheets; }
    getSheetByName(n) { return state.sheets.find((s) => s.name === n) || null; }
    insertSheet(n) {
      if (this.getSheetByName(n)) throw new Error(`A sheet with the name "${n}" already exists.`);
      const s = new Sheet(n);
      state.sheets.push(s);
      return s;
    }
    deleteSheet(s) { state.sheets = state.sheets.filter((x) => x !== s); }
  }
  const ss = new Spreadsheet();
  const initial = new Sheet('Foglio1');
  state.sheets.push(initial);

  const ui = {
    ButtonSet: { OK: 'OK', OK_CANCEL: 'OK_CANCEL' },
    Button: { OK: 'OK', CANCEL: 'CANCEL' },
    prompt(title, message) {
      state.promptLog.push({ title, message });
      const answer = state.prompts.length ? state.prompts.shift() : '';
      return { getSelectedButton: () => (answer === null ? 'CANCEL' : 'OK'), getResponseText: () => (answer === null ? '' : answer) };
    },
    alert(title, message) {
      state.alerts.push({ title, message });
    },
    createMenu(name) {
      const menu = { name, items: [] };
      const b = {
        addItem(label, fn) { menu.items.push([label, fn]); return b; },
        addSeparator() { return b; },
        addToUi() { state.menus.push(menu); },
      };
      return b;
    },
  };

  // ---------- Servizi globali ----------
  const pad = (n) => String(n).padStart(2, '0');
  const g = ctx;
  g.SpreadsheetApp = {
    getActiveSpreadsheet: () => ss,
    openById: () => ss,
    getUi: () => ui,
  };
  g.DriveApp = {
    Access: { ANYONE_WITH_LINK: 'ANYONE_WITH_LINK' },
    Permission: { VIEW: 'VIEW' },
    createFolder(name) {
      const folder = { id: 'folder-' + (state.folders.length + 1), name, files: [] };
      state.folders.push(folder);
      return wrapFolder(folder);
    },
    getFolderById(id) {
      const f = state.folders.find((x) => x.id === id);
      if (!f) throw new Error('Exception: Unexpected error while getting the folder');
      return wrapFolder(f);
    },
    getFileById(id) {
      const f = state.files.find((x) => x.id === id);
      if (!f) throw new Error('Exception: File not found');
      return wrapFile(f);
    },
  };
  const wrapFile = (f) => ({
    getId: () => f.id,
    getName: () => f.name,
    setSharing(access, permission) { f.sharing = [access, permission]; return this; },
    setTrashed(t) { f.trashed = t; return this; },
  });
  const wrapFolder = (folder) => ({
    getId: () => folder.id,
    createFile(blob) {
      const f = { id: 'file-' + crypto.randomBytes(6).toString('hex'), name: blob.getName(), mime: blob.getContentType(), size: blob.getBytes().length, sharing: null, trashed: false, folder: folder.id };
      state.files.push(f);
      return wrapFile(f);
    },
  });
  g.MailApp = {
    getRemainingDailyQuota: () => state.mailQuota - state.mailSent,
    sendEmail(opts) {
      if (state.mailFail) throw new Error(state.mailFail);
      if (!opts || typeof opts !== 'object') throw new Error('Invalid arguments');
      for (const [k, v] of Object.entries(opts)) if (v === undefined) throw new Error(`Invalid argument: ${k}`);
      state.mailSent += String(opts.to).split(',').length;
      state.outbox.push({ ...opts, toList: String(opts.to).split(',') });
    },
  };
  g.Utilities = {
    DigestAlgorithm: { SHA_256: 'SHA_256' },
    Charset: { UTF_8: 'UTF_8' },
    computeDigest(alg, value) {
      const raw = crypto.createHash('sha256').update(typeof value === 'string' ? value : Buffer.from(value)).digest();
      return Array.from(raw, (b) => (b > 127 ? b - 256 : b));
    },
    getUuid: () => crypto.randomUUID(),
    base64Decode: (s) => Array.from(Buffer.from(s, 'base64'), (b) => (b > 127 ? b - 256 : b)),
    newBlob: (bytes, mime, name) => ({ getBytes: () => bytes, getContentType: () => mime, getName: () => name }),
    sleep() {},
    formatDate(date, tz, pattern) {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
      }).formatToParts(new Date(date.getTime()));
      const v = (t) => parts.find((p) => p.type === t).value;
      return pattern
        .replace('yyyy', v('year')).replace('MM', v('month')).replace('dd', v('day'))
        .replace('HH', v('hour')).replace('mm', v('minute')).replace('ss', v('second'));
    },
  };
  g.PropertiesService = {
    getScriptProperties: () => ({
      getProperty: (k) => (k in state.props ? state.props[k] : null),
      setProperty: (k, v) => { state.props[k] = String(v); },
      deleteProperty: (k) => { delete state.props[k]; },
    }),
  };
  g.LockService = {
    getScriptLock: () => ({
      waitLock() {
        if (state.lockHeld) throw new Error('Lock timeout: another process was holding the lock for too long.');
        state.lockHeld = true;
        state.lockAcquisitions++;
      },
      releaseLock() { state.lockHeld = false; },
    }),
  };
  g.ScriptApp = {
    getProjectTriggers: () => state.triggers.map((t) => ({ getHandlerFunction: () => t.fn })),
    newTrigger(fn) {
      const t = { fn, every: null };
      const b = { timeBased() { return b; }, everyHours(n) { t.every = n; return b; }, create() { state.triggers.push(t); return t; } };
      return b;
    },
    getService: () => ({ getUrl: () => state.webAppUrl }),
  };
  g.ContentService = {
    MimeType: { JSON: 'JSON' },
    createTextOutput: (text) => ({ text, mime: null, setMimeType(m) { this.mime = m; return this; }, getContent() { return this.text; } }),
  };
  g.Session = {
    getEffectiveUser: () => ({ getEmail: () => state.ownerEmail }),
    getActiveUser: () => ({ getEmail: () => state.ownerEmail }),
  };
  g.console = {
    log() {},
    info() {},
    warn: (...a) => state.consoleWarnings.push(a.join(' ')),
    error: (...a) => state.consoleErrors.push(a.join(' ')),
  };

  vm.runInContext(fs.readFileSync(CODE, 'utf8'), ctx, { filename: 'Code.gs' });

  // ---------- Aiuti per i test ----------
  const call = (a, p = {}, t) => {
    const out = ctx.doPost({ postData: { contents: JSON.stringify({ a, p, t }) } });
    return JSON.parse(out.getContent());
  };
  const setNow = (iso) => { ctx.now_ = () => new D(iso); };
  const resetNow = () => { ctx.now_ = () => new D(); };
  const sheetByName = (n) => state.sheets.find((s) => s.name === n);
  /** Contenuto di un foglio come matrice di testi (esclude le righe vuote) */
  const dump = (n) => {
    const sh = sheetByName(n);
    const rows = [];
    for (let r = 1; r <= sh.getLastRow(); r++) rows.push(Array.from({ length: sh.getLastColumn() }, (_, c) => sh.get(r, c + 1)));
    return rows;
  };
  return { ctx, state, call, setNow, resetNow, sheetByName, dump, D };
}
