import * as XLSX from 'xlsx';

export interface Pair {
  q: number;
  a: number;
}

export interface TurnoverCardRow {
  cardLabel: string;
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

export interface TurnoverReport {
  from: string;
  to: string;
  clientLabel: string;
  groups: TurnoverClientGroup[];
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
  clients: any[];
  cards: any[];
  fuelTypes: any[];
  operations: any[];
}): TurnoverReport {
  const { from, to, clientId, clients, cards, fuelTypes, operations } = params;

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
            fuel: card.fuel_type || ft?.name || '',
            unit: ft?.unit || 'л',
            open: s.open,
            income: s.income,
            outcome: s.outcome,
            close,
          });
        });
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

  const total: TurnoverReport = {
    from,
    to,
    clientLabel: clientId === 'all' ? 'Все клиенты' : selectedClients[0]?.name || '',
    groups,
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
            `<tr><td class="nw">${esc(r.cardLabel)}</td><td>${esc(r.fuel)}</td><td class="c">${esc(r.unit)}</td>${pairCells(r.open)}${pairCells(r.income)}${pairCells(r.outcome)}${pairCells(r.close)}</tr>`
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

  const html = `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>Оборотная ведомость</title>
<style>
@page { size: A4 landscape; margin: 8mm; }
* { box-sizing: border-box; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 8pt; color: #000; margin: 0; }
h1 { font-size: 12pt; margin: 0 0 2mm; }
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
<h1>Оборотная ведомость по топливным картам</h1>
<div class="meta">Период: ${esc(ruDate(report.from))} — ${esc(ruDate(report.to))}. Клиент: ${esc(report.clientLabel)}.<br>Сформировано: ${esc(new Date().toLocaleString('ru-RU'))}.</div>
<table>
<thead>
<tr><th rowspan="2">Карта</th><th rowspan="2">Вид топлива</th><th rowspan="2">Ед. изм.</th><th colspan="2">Остаток на начало</th><th colspan="2">Приход</th><th colspan="2">Расход</th><th colspan="2">Остаток на конец</th></tr>
<tr><th>Кол-во</th><th>Сумма</th><th>Кол-во</th><th>Сумма</th><th>Кол-во</th><th>Сумма</th><th>Кол-во</th><th>Сумма</th></tr>
</thead>
<tbody>${body}${empty}</tbody>
${foot}
</table>
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
    ['Оборотная ведомость по топливным картам'],
    [`Период: ${ruDate(report.from)} — ${ruDate(report.to)}. Клиент: ${report.clientLabel}`],
    [],
    ['Клиент / Карта', 'Вид топлива', 'Ед. изм.', 'Остаток на начало', '', 'Приход', '', 'Расход', '', 'Остаток на конец', ''],
    ['', '', '', 'Кол-во', 'Сумма', 'Кол-во', 'Сумма', 'Кол-во', 'Сумма', 'Кол-во', 'Сумма'],
  ];
  const groupRows: number[] = [];
  const pairs = (p: Pair, showQty = true): (string | number)[] => [showQty ? p.q : '', p.a];

  report.groups.forEach((g) => {
    const single = g.units.length === 1;
    groupRows.push(aoa.length);
    aoa.push([g.clientName, '', unitLabel(g.units), ...pairs(g.open, single), ...pairs(g.income, single), ...pairs(g.outcome, single), ...pairs(g.close, single)]);
    g.cards.forEach((r) => {
      aoa.push([`    ${r.cardLabel}`, r.fuel, r.unit, ...pairs(r.open), ...pairs(r.income), ...pairs(r.outcome), ...pairs(r.close)]);
    });
  });
  const tSingle = report.units.length === 1;
  const totalRow = aoa.length;
  aoa.push(['Итого', '', unitLabel(report.units), ...pairs(report.open, tSingle), ...pairs(report.income, tSingle), ...pairs(report.outcome, tSingle), ...pairs(report.close, tSingle)]);

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
  for (let r = 5; r <= totalRow; r++) {
    for (let c = 3; c <= 10; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && typeof cell.v === 'number') cell.z = c % 2 === 1 ? '#,##0.000' : '#,##0.00';
    }
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Оборотка');
  XLSX.writeFile(wb, `turnover_${report.from}_${report.to}.xlsx`);
}
