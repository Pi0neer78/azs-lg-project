import * as XLSX from 'xlsx';

export interface OperationRow {
  card_code: string;
  card_index?: number;
  client_name?: string;
  fuel_type?: string;
  op_fuel_type?: string;
  station_name?: string;
  operation_date: string;
  operation_type: string;
  quantity: number;
  price: number;
  amount: number;
  comment?: string;
}

const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const cardText = (op: OperationRow) => `${op.card_code}/${op.card_index ?? 0}`;
const fuelText = (op: OperationRow) => op.op_fuel_type || op.fuel_type || '';
const money = (n: number) => n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const liters = (n: number) => n.toLocaleString('ru-RU', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export function printOperations(rows: OperationRow[], filters: string[]) {
  const totalQty = rows.reduce((s, o) => s + (o.quantity || 0), 0);
  const totalAmount = rows.reduce((s, o) => s + (o.amount || 0), 0);
  const body = rows
    .map(
      (o) => `<tr>
<td class="nw">${esc(o.operation_date)}</td>
<td class="nw">${esc(cardText(o))}</td>
<td>${esc(o.client_name)}</td>
<td>${esc(fuelText(o))}</td>
<td>${esc(o.station_name)}</td>
<td>${esc(o.operation_type)}</td>
<td class="r nw">${liters(o.quantity || 0)}</td>
<td class="r nw">${money(o.price || 0)}</td>
<td class="r nw">${money(o.amount || 0)}</td>
<td>${esc(o.comment)}</td>
</tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>Операции по картам</title>
<style>
@page { size: A4 landscape; margin: 8mm; }
* { box-sizing: border-box; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 8pt; color: #000; margin: 0; }
h1 { font-size: 12pt; margin: 0 0 2mm; }
.meta { font-size: 8pt; margin-bottom: 3mm; color: #333; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th, td { border: 0.3mm solid #444; padding: 0.6mm 1mm; vertical-align: top; word-wrap: break-word; overflow-wrap: anywhere; line-height: 1.15; }
th { background: #e6e6e6; font-weight: bold; text-align: left; }
thead { display: table-header-group; }
tr { page-break-inside: avoid; }
.r { text-align: right; }
.nw { white-space: nowrap; }
tfoot td { font-weight: bold; background: #f2f2f2; }
col.c-date { width: 22mm; } col.c-card { width: 17mm; } col.c-client { width: 38mm; } col.c-fuel { width: 24mm; }
col.c-station { width: 32mm; } col.c-type { width: 22mm; } col.c-qty { width: 20mm; } col.c-price { width: 16mm; }
col.c-amount { width: 22mm; } col.c-comment { width: auto; }
</style></head><body>
<h1>Операции по картам</h1>
<div class="meta">Сформировано: ${esc(new Date().toLocaleString('ru-RU'))}. Записей: ${rows.length}.${filters.length ? ' Фильтр: ' + esc(filters.join('; ')) + '.' : ' Без фильтров.'}</div>
<table>
<colgroup><col class="c-date"><col class="c-card"><col class="c-client"><col class="c-fuel"><col class="c-station"><col class="c-type"><col class="c-qty"><col class="c-price"><col class="c-amount"><col class="c-comment"></colgroup>
<thead><tr><th>Дата</th><th>Карта</th><th>Клиент</th><th>Топливо</th><th>АЗС</th><th>Операция</th><th class="r">Кол-во</th><th class="r">Цена</th><th class="r">Сумма</th><th>Комментарий</th></tr></thead>
<tbody>${body}</tbody>
<tfoot><tr><td colspan="6">Итого</td><td class="r nw">${liters(totalQty)}</td><td></td><td class="r nw">${money(totalAmount)}</td><td></td></tr></tfoot>
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

export function exportOperationsToExcel(rows: OperationRow[]) {
  const header = ['Дата', 'Карта', 'Клиент', 'Топливо', 'АЗС', 'Операция', 'Кол-во', 'Цена', 'Сумма', 'Комментарий'];
  const data = rows.map((o) => [
    o.operation_date,
    cardText(o),
    o.client_name || '',
    fuelText(o),
    o.station_name || '',
    o.operation_type,
    o.quantity || 0,
    o.price || 0,
    o.amount || 0,
    o.comment || '',
  ]);
  const totalQty = rows.reduce((s, o) => s + (o.quantity || 0), 0);
  const totalAmount = rows.reduce((s, o) => s + (o.amount || 0), 0);
  data.push(['Итого', '', '', '', '', '', totalQty, '', totalAmount, '']);

  const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
  ws['!cols'] = [
    { wch: 17 }, { wch: 10 }, { wch: 28 }, { wch: 16 }, { wch: 22 },
    { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 40 },
  ];
  ws['!autofilter'] = { ref: `A1:J${rows.length + 1}` };
  ws['!freeze'] = { xSplit: 0, ySplit: 1 } as never;
  for (let r = 2; r <= rows.length + 2; r++) {
    const q = ws[`G${r}`];
    const p = ws[`H${r}`];
    const a = ws[`I${r}`];
    if (q) q.z = '0.000';
    if (p) p.z = '0.00';
    if (a) a.z = '0.00';
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Операции');
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  XLSX.writeFile(wb, `operations_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.xlsx`);
}
