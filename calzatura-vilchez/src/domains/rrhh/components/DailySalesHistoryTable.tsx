import type { WorkerDailySalesRow } from "@/types";

function currency(value: number) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

type Props = {
  rows: WorkerDailySalesRow[];
  emptyMessage?: string;
};

export default function DailySalesHistoryTable({ rows, emptyMessage = "Sin ventas en este periodo." }: Props) {
  if (rows.length === 0) {
    return <p className="staff-empty-state">{emptyMessage}</p>;
  }

  return (
    <div className="hr-data-table-wrap">
      <table className="hr-data-table">
        <thead>
          <tr>
            <th scope="col">Fecha</th>
            <th scope="col">Pares vendidos</th>
            <th scope="col">Transacciones</th>
            <th scope="col">Total ventas</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.fecha}>
              <td>{new Date(`${row.fecha}T12:00:00`).toLocaleDateString("es-PE", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}</td>
              <td><strong>{row.pares}</strong></td>
              <td>{row.transacciones}</td>
              <td>{currency(row.ventasTotal)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Total periodo</td>
            <td><strong>{rows.reduce((acc, row) => acc + row.pares, 0)}</strong></td>
            <td>{rows.reduce((acc, row) => acc + row.transacciones, 0)}</td>
            <td>{currency(rows.reduce((acc, row) => acc + row.ventasTotal, 0))}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
