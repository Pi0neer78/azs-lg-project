import * as XLSX from 'xlsx';

export interface Pair {
  q: number;
  a: number;
}

export interface TurnoverCardRow {
  cardLabel: string;
  cardsCount: number;
  fuel: string;
  unit: string;
  open: Pair;
  income: Pair;
  outcome: Pair;
  close: Pair;
}

export interface TurnoverClientGroup {
  clientName: string;
  cards: TurnoverCardRow[];
  units: string[];
  open: Pair;
  income: Pair;
  outcome: Pair;
  close: Pair;
}

export interface RubleFuelRow {
  fuel: string;
  unit: string;
  qty: number;
  amount: number;
}

export interface RubleCardUsage {
  clientName: string;
  cardLabel: string;
  rows: RubleFuelRow[];
  amount: number;
}

export interface RubleUsage {
  cards: RubleCardUsage[];
  totals: RubleFuelRow[];
  amount: number;
  singleUnit: boolean;
  showClient: boolean;
}

export type TurnoverMode = 'cards' | 'fuel';

export interface TurnoverReport {
  mode: TurnoverMode;
  from: string;
  to: string;
  clientLabel: string;
  groups: TurnoverClientGroup[];
  fuelTotals: TurnoverCardRow[];
  rubleUsage: RubleUsage | null;
  units: string[];
  open: Pair;
  income: Pair;
  outcome: Pair;
  close: Pair;
}

const zero = (): Pair => ({ q: 0, a: 0 });
const add = (t: Pair, p: Pair) => {
  t.q += p.q;
  t.a += p.a;
};

const INCOME_TYPES = ['пополнение', 'оприходование'];

const effect = (op: any): 1 | -1 | 0 => {
  if (INCOME_TYPES.includes(op.operation_type)) return 1;
  if (op.operation_type === 'списание') return -1;
  if (op.operation_type === 'заправка' && !op.op_fuel_type_id) return -1;
  return 0;
};

export function buildTurnoverReport(params: {
  from: string;
  to: string;
  clientId: string;
  mode?: TurnoverMode;
  withRubleUsage?: boolean;
  clients: any[];
  cards: any[];
  fuelTypes: any[];
  operations: any[];
}): TurnoverReport {
  const { from, to, clientId, clients, cards, fuelTypes, operations } = params;
  const mode: TurnoverMode = params.mode || 'cards';

  const selectedClients =
    clientId === 'all'
      ? clients.filter((c) => !c.admin && !c.operator)
      : clients.filter((c) => String(c.id) === clientId);

  const cardById = new Map<number, any>(cards.map((c) => [c.id, c]));
  const stats = new Map<number, { open: Pair; income: Pair; outcome: Pair }>();
  const get = (id: number) => {
    if (!stats.has(id)) stats.set(id, { open: zero(), income: zero(), outcome: zero() });
    return stats.get(id)!;
  };

  operations.forEach((op) => {
    const dir = effect(op);
    if (!dir || !cardById.has(op.fuel_card_id)) return;
    const day = String(op.operation_date || '').slice(0, 10);
    if (!day || day > to) return;
    const p: Pair = { q: op.quantity || 0, a: op.amount || 0 };
    const s = get(op.fuel_card_id);
    if (day < from) {
      s.open.q += dir * p.q;
      s.open.a += dir * p.a;
    } else if (dir === 1) {
      add(s.income, p);
    } else {
      add(s.outcome, p);
    }
  });

  const groups: TurnoverClientGroup[] = [];
  selectedClients
    .slice()
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'ru'))
    .forEach((client) => {
      const rows: TurnoverCardRow[] = [];
      cards
        .filter((c) => c.client_id === client.id)
        .sort((a, b) => a.card_code.localeCompare(b.card_code) || (a.card_index ?? 0) - (b.card_index ?? 0))
        .forEach((card) => {
          const s = stats.get(card.id) || { open: zero(), income: zero(), outcome: zero() };
          const close: Pair = {
            q: s.open.q + s.income.q - s.outcome.q,
            a: s.open.a + s.income.a - s.outcome.a,
          };
          const hasData = [s.open, s.income, s.outcome, close].some((p) => Math.abs(p.q) > 1e-9 || Math.abs(p.a) > 1e-9);
          if (!hasData) return;
          const ft = fuelTypes.find((f) => f.id === card.fuel_type_id);
          rows.push({
            cardLabel: `${card.card_code}/${card.card_index ?? 0}`,
            cardsCount: 1,
            fuel: card.fuel_type || ft?.name || '',
            unit: ft?.unit || 'л',
            open: s.open,
            income: s.income,
            outcome: s.outcome,
            close,
          });
        });
      if (mode === 'fuel') {
        const byFuel = new Map<string, TurnoverCardRow>();
        rows.forEach((r) => {
          const key = `${r.fuel}|${r.unit}`;
          const cur = byFuel.get(key);
          if (!cur) {
            byFuel.set(key, {
              cardLabel: '',
              cardsCount: 1,
              fuel: r.fuel,
              unit: r.unit,
              open: { ...r.open },
              income: { ...r.income },
              outcome: { ...r.outcome },
              close: { ...r.close },
            });
          } else {
            cur.cardsCount += 1;
            add(cur.open, r.open);
            add(cur.income, r.income);
            add(cur.outcome, r.outcome);
            add(cur.close, r.close);
          }
        });
        rows.length = 0;
        Array.from(byFuel.values())
          .sort((x, y) => x.fuel.localeCompare(y.fuel, 'ru'))
          .forEach((r) => rows.push(r));
      }
      const g: TurnoverClientGroup = {
        clientName: client.name,
        cards: rows,
        units: Array.from(new Set(rows.map((r) => r.unit))),
        open: zero(),
        income: zero(),
        outcome: zero(),
        close: zero(),
      };
      rows.forEach((r) => {
        add(g.open, r.open);
        add(g.income, r.income);
        add(g.outcome, r.outcome);
        add(g.close, r.close);
      });
      groups.push(g);
    });

  const fuelMap = new Map<string, TurnoverCardRow>();
  if (clientId === 'all') {
    groups.forEach((g) =>
      g.cards.forEach((r) => {
        const key = `${r.fuel}|${r.unit}`;
        const cur = fuelMap.get(key);
        if (!cur) {
          fuelMap.set(key, {
            cardLabel: '',
            cardsCount: r.cardsCount,
            fuel: r.fuel,
            unit: r.unit,
            open: { ...r.open },
            income: { ...r.income },
            outcome: { ...r.outcome },
            close: { ...r.close },
          });
        } else {
          cur.cardsCount += r.cardsCount;
          add(cur.open, r.open);
          add(cur.income, r.income);
          add(cur.outcome, r.outcome);
          add(cur.close, r.close);
        }
      })
    );
  }
  const fuelTotals = Array.from(fuelMap.values()).sort((x, y) => x.fuel.localeCompare(y.fuel, 'ru'));

  let rubleUsage: RubleUsage | null = null;
  if (mode === 'fuel' && params.withRubleUsage) {
    const clientIds = new Set(selectedClients.map((c) => c.id));
    const clientNameById = new Map<number, string>(clients.map((c) => [c.id, c.name]));
    const rubleCards = cards
      .filter((c) => clientIds.has(c.client_id) && fuelTypes.find((f) => f.id === c.fuel_type_id)?.unit === '₽')
      .sort((a, b) => a.card_code.localeCompare(b.card_code) || (a.card_index ?? 0) - (b.card_index ?? 0));
    if (rubleCards.length > 0) {
      const usage = new Map<number, Map<string, RubleFuelRow>>();
      operations.forEach((op) => {
        if (op.operation_type !== 'заправка' || !op.op_fuel_type_id) return;
        const day = String(op.operation_date || '').slice(0, 10);
        if (!day || day < from || day > to) return;
        if (!rubleCards.some((c) => c.id === op.fuel_card_id)) return;
        const ft = fuelTypes.find((f) => f.id === op.op_fuel_type_id);
        const name = op.op_fuel_type || ft?.name || '';
        const unit = ft?.unit || 'л';
        const byFuel = usage.get(op.fuel_card_id) || new Map<string, RubleFuelRow>();
        const key = `${name}|${unit}`;
        const row = byFuel.get(key) || { fuel: name, unit, qty: 0, amount: 0 };
        row.qty += op.quantity || 0;
        row.amount += op.amount || 0;
        byFuel.set(key, row);
        usage.set(op.fuel_card_id, byFuel);
      });
      const totalsMap = new Map<string, RubleFuelRow>();
      const cardsUsage: RubleCardUsage[] = rubleCards.map((card) => {
        const rows = Array.from(usage.get(card.id)?.values() || []).sort((x, y) => x.fuel.localeCompare(y.fuel, 'ru'));
        rows.forEach((r) => {
          const key = `${r.fuel}|${r.unit}`;
          const t = totalsMap.get(key) || { fuel: r.fuel, unit: r.unit, qty: 0, amount: 0 };
          t.qty += r.qty;
          t.amount += r.amount;
          totalsMap.set(key, t);
        });
        return {
          clientName: clientNameById.get(card.client_id) || '',
          cardLabel: `${card.card_code}/${card.card_index ?? 0}`,
          rows,
          amount: rows.reduce((sum, r) => sum + r.amount, 0),
        };
      });
      const totals = Array.from(totalsMap.values()).sort((x, y) => x.fuel.localeCompare(y.fuel, 'ru'));
      rubleUsage = {
        cards: cardsUsage,
        totals,
        amount: totals.reduce((sum, r) => sum + r.amount, 0),
        singleUnit: new Set(totals.map((t) => t.unit)).size <= 1,
        showClient: clientId === 'all',
      };
    }
  }

  const total: TurnoverReport = {
    mode,
    from,
    to,
    clientLabel: clientId === 'all' ? 'Все клиенты' : selectedClients[0]?.name || '',
    groups,
    fuelTotals,
    rubleUsage,
    units: Array.from(new Set(groups.flatMap((g) => g.units))),
    open: zero(),
    income: zero(),
    outcome: zero(),
    close: zero(),
  };
  groups.forEach((g) => {
    add(total.open, g.open);
    add(total.income, g.income);
    add(total.outcome, g.outcome);
    add(total.close, g.close);
  });
  return total;
}

const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
const qty = (n: number) => n.toLocaleString('ru-RU', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const money = (n: number) => n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ruDate = (s: string) => (s ? s.split('-').reverse().join('.') : '');
export const reportTitle = (r: { mode: TurnoverMode }) =>
  r.mode === 'fuel' ? 'Оборотная ведомость по видам топлива' : 'Оборотная ведомость по картам';
const rubleCardTitle = (u: RubleCardUsage, showClient: boolean) =>
  `Карта ${u.cardLabel}${showClient && u.clientName ? ` (${u.clientName})` : ''}`;
const unitLabel = (units: string[]) => (units.length === 1 ? units[0] : '');

const pairCells = (p: Pair, showQty = true) =>
  `<td class="r nw">${showQty ? qty(p.q) : ''}</td><td class="r nw">${money(p.a)}</td>`;

export function printTurnover(report: TurnoverReport) {
  const body = report.groups
    .map((g) => {
      const single = g.units.length === 1;
      const head = `<tr class="grp"><td colspan="3">${esc(g.clientName)}</td>${pairCells(g.open, single)}${pairCells(g.income, single)}${pairCells(g.outcome, single)}${pairCells(g.close, single)}</tr>`;
      const rows = g.cards
        .map(
          (r) =>
            `${report.mode === 'fuel' ? `<tr><td>${esc(r.fuel)}</td><td class="c">Карт: ${r.cardsCount}</td>` : `<tr><td class="nw">${esc(r.cardLabel)}</td><td>${esc(r.fuel)}</td>`}<td class="c">${esc(r.unit)}</td>${pairCells(r.open)}${pairCells(r.income)}${pairCells(r.outcome)}${pairCells(r.close)}</tr>`
        )
        .join('');
      return head + rows;
    })
    .join('');
  const tSingle = report.units.length === 1;
  const empty = report.groups.length === 0 ? '<tr><td colspan="11" class="c">Нет данных за выбранный период</td></tr>' : '';
  const foot =
    report.groups.length > 0
      ? `<tfoot><tr><td colspan="3">Итого${tSingle ? '' : ' (количество не суммируется: разные единицы)'}</td>${pairCells(report.open, tSingle)}${pairCells(report.income, tSingle)}${pairCells(report.outcome, tSingle)}${pairCells(report.close, tSingle)}</tr></tfoot>`
      : '';
  const fuelBlock =
    report.fuelTotals.length > 0
      ? `<h2>Итого по видам топлива (все клиенты)</h2>
<table>
<thead>
<tr><th rowspan="2">Вид топлива</th><th rowspan="2">Карт</th><th rowspan="2">Ед. изм.</th><th colspan="2">Остаток на начало</th><th colspan="2">Приход</th><th colspan="2">Расход</th><th colspan="2">Остаток на конец</th></tr>
<tr><th>Кол-во</th><th>Сумма</th><th>Кол-во</th><th>Сумма</th><th>Кол-во</th><th>Сумма</th><th>Кол-во</th><th>Сумма</th></tr>
</thead>
<tbody>${report.fuelTotals
          .map(
            (r) =>
              `<tr><td>${esc(r.fuel)}</td><td class="c">${r.cardsCount}</td><td class="c">${esc(r.unit)}</td>${pairCells(r.open)}${pairCells(r.income)}${pairCells(r.outcome)}${pairCells(r.close)}</tr>`
          )
          .join('')}</tbody>
</table>`
      : '';

  const ru = report.rubleUsage;
  const ruRows = (rows: RubleFuelRow[], showQty: boolean) =>
    rows
      .map(
        (r) =>
          `<tr><td>${esc(r.fuel)}</td><td class="c">${esc(r.unit)}</td><td class="r nw">${showQty ? qty(r.qty) : ''}</td><td class="r nw">${money(r.amount)}</td></tr>`
      )
      .join('');
  const ruHead = '<thead><tr><th>Вид топлива</th><th>Ед. изм.</th><th>Кол-во</th><th>Сумма, ₽</th></tr></thead>';
  const rubleBlock = ru
    ? `<h2>Рублёвые карты: использованное топливо за период</h2>
${ru.cards
  .map(
    (u) =>
      `<table style="width:auto;min-width:50%;margin-bottom:3mm"><tr class="grp"><td colspan="3">${esc(rubleCardTitle(u, ru.showClient))}</td><td class="r nw">${money(u.amount)}</td></tr>${
        u.rows.length ? ruRows(u.rows, true) : '<tr><td colspan="4" class="c">Заправок за период нет</td></tr>'
      }</table>`
  )
  .join('')}
<h2>Итого по всем рублёвым картам и видам топлива</h2>
<table style="width:auto;min-width:50%">${ruHead}<tbody>${
        ru.totals.length ? ruRows(ru.totals, true) : '<tr><td colspan="4" class="c">Заправок за период нет</td></tr>'
      }</tbody><tfoot><tr><td colspan="3">Итого сумма</td><td class="r nw">${money(ru.amount)}</td></tr></tfoot></table>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>${esc(reportTitle(report))}</title>
<style>
@page { size: A4 landscape; margin: 8mm; }
* { box-sizing: border-box; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 8pt; color: #000; margin: 0; }
h1 { font-size: 12pt; margin: 0 0 2mm; }
h2 { font-size: 10pt; margin: 6mm 0 2mm; page-break-after: avoid; }
.meta { font-size: 8pt; margin-bottom: 3mm; color: #333; line-height: 1.4; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 0.3mm solid #444; padding: 0.7mm 1.2mm; vertical-align: middle; line-height: 1.15; }
th { background: #e6e6e6; font-weight: bold; text-align: center; }
thead { display: table-header-group; }
tr { page-break-inside: avoid; }
.r { text-align: right; }
.c { text-align: center; }
.nw { white-space: nowrap; }
tr.grp td { background: #f0f0f0; font-weight: bold; }
tfoot td { font-weight: bold; background: #dcdcdc; }
</style></head><body>
<h1>${esc(reportTitle(report))}</h1>
<div class="meta">Период: ${esc(ruDate(report.from))} — ${esc(ruDate(report.to))}. Клиент: ${esc(report.clientLabel)}.<br>Сформировано: ${esc(new Date().toLocaleString('ru-RU'))}.</div>
<table>
<thead>
${report.mode === 'fuel' ? '<tr><th rowspan="2">Вид топлива</th><th rowspan="2">Карт</th><th rowspan="2">Ед. изм.</th>' : '<tr><th rowspan="2">Карта</th><th rowspan="2">Вид топлива</th><th rowspan="2">Ед. изм.</th>'}<th colspan="2">Остаток на начало</th><th colspan="2">Приход</th><th colspan="2">Расход</th><th colspan="2">Остаток на конец</th></tr>
<tr><th>Кол-во</th><th>Сумма</th><th>Кол-во</th><th>Сумма</th><th>Кол-во</th><th>Сумма</th><th>Кол-во</th><th>Сумма</th></tr>
</thead>
<tbody>${body}${empty}</tbody>
${foot}
</table>
${fuelBlock}
${rubleBlock}
<script>window.onload=function(){setTimeout(function(){window.focus();window.print();},300);};</script>
</body></html>`;

  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}

export function exportTurnoverToExcel(report: TurnoverReport) {
  const aoa: (string | number)[][] = [
    [reportTitle(report)],
    [`Период: ${ruDate(report.from)} — ${ruDate(report.to)}. Клиент: ${report.clientLabel}`],
    [],
    [report.mode === 'fuel' ? 'Клиент / Вид топлива' : 'Клиент / Карта', report.mode === 'fuel' ? 'Карт' : 'Вид топлива', 'Ед. изм.', 'Остаток на начало', '', 'Приход', '', 'Расход', '', 'Остаток на конец', ''],
    ['', '', '', 'Кол-во', 'Сумма', 'Кол-во', 'Сумма', 'Кол-во', 'Сумма', 'Кол-во', 'Сумма'],
  ];
  const groupRows: number[] = [];
  const pairs = (p: Pair, showQty = true): (string | number)[] => [showQty ? p.q : '', p.a];

  report.groups.forEach((g) => {
    const single = g.units.length === 1;
    groupRows.push(aoa.length);
    aoa.push([g.clientName, '', unitLabel(g.units), ...pairs(g.open, single), ...pairs(g.income, single), ...pairs(g.outcome, single), ...pairs(g.close, single)]);
    g.cards.forEach((r) => {
      aoa.push([report.mode === 'fuel' ? `    ${r.fuel}` : `    ${r.cardLabel}`, report.mode === 'fuel' ? r.cardsCount : r.fuel, r.unit, ...pairs(r.open), ...pairs(r.income), ...pairs(r.outcome), ...pairs(r.close)]);
    });
  });
  const tSingle = report.units.length === 1;
  aoa.push(['Итого', '', unitLabel(report.units), ...pairs(report.open, tSingle), ...pairs(report.income, tSingle), ...pairs(report.outcome, tSingle), ...pairs(report.close, tSingle)]);

  const fuelHeaderRow = report.fuelTotals.length > 0 ? aoa.length + 1 : -1;
  if (report.fuelTotals.length > 0) {
    aoa.push([]);
    aoa.push(['Итого по видам топлива (все клиенты)']);
    aoa.push(['Вид топлива', 'Карт', 'Ед. изм.', 'Остаток на начало', '', 'Приход', '', 'Расход', '', 'Остаток на конец', '']);
    aoa.push(['', '', '', 'Кол-во', 'Сумма', 'Кол-во', 'Сумма', 'Кол-во', 'Сумма', 'Кол-во', 'Сумма']);
    report.fuelTotals.forEach((r) => {
      aoa.push([r.fuel, r.cardsCount, r.unit, ...pairs(r.open), ...pairs(r.income), ...pairs(r.outcome), ...pairs(r.close)]);
    });
  }
  const ru = report.rubleUsage;
  if (ru) {
    aoa.push([]);
    aoa.push(['Рублёвые карты: использованное топливо за период']);
    aoa.push(['Карта / Вид топлива', '', 'Ед. изм.', 'Количество', 'Сумма, ₽']);
    ru.cards.forEach((u) => {
      aoa.push([rubleCardTitle(u, ru.showClient), '', '', '', u.amount]);
      if (u.rows.length === 0) aoa.push(['    Заправок за период нет']);
      u.rows.forEach((r) => aoa.push([`    ${r.fuel}`, '', r.unit, r.qty, r.amount]));
    });
    aoa.push([]);
    aoa.push(['Итого по всем рублёвым картам и видам топлива']);
    aoa.push(['Вид топлива', '', 'Ед. изм.', 'Количество', 'Сумма, ₽']);
    ru.totals.forEach((r) => aoa.push([r.fuel, '', r.unit, r.qty, r.amount]));
    aoa.push(['Итого сумма', '', '', '', ru.amount]);
  }
  const lastRow = aoa.length - 1;

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 34 }, { wch: 18 }, { wch: 9 }, ...Array(8).fill({ wch: 14 })];
  ws['!merges'] = [
    { s: { r: 3, c: 0 }, e: { r: 4, c: 0 } },
    { s: { r: 3, c: 1 }, e: { r: 4, c: 1 } },
    { s: { r: 3, c: 2 }, e: { r: 4, c: 2 } },
    { s: { r: 3, c: 3 }, e: { r: 3, c: 4 } },
    { s: { r: 3, c: 5 }, e: { r: 3, c: 6 } },
    { s: { r: 3, c: 7 }, e: { r: 3, c: 8 } },
    { s: { r: 3, c: 9 }, e: { r: 3, c: 10 } },
  ];
  if (fuelHeaderRow > 0) {
    const h = fuelHeaderRow + 1;
    [0, 1, 2].forEach((c) => ws['!merges']!.push({ s: { r: h, c }, e: { r: h + 1, c } }));
    [3, 5, 7, 9].forEach((c) => ws['!merges']!.push({ s: { r: h, c }, e: { r: h, c: c + 1 } }));
  }
  for (let r = 5; r <= lastRow; r++) {
    for (let c = 3; c <= 10; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && typeof cell.v === 'number') cell.z = c % 2 === 1 ? '#,##0.000' : '#,##0.00';
    }
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, report.mode === 'fuel' ? 'Оборотка по топливу' : 'Оборотка по картам');
  XLSX.writeFile(wb, `turnover_${report.mode}_${report.from}_${report.to}.xlsx`);
}
