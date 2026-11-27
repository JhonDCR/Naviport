import {
  GERENTE_MONTHLY_BARS,
  GERENTE_PUNTUALIDAD_BARS,
  GERENTE_RECENT_ALERTS,
} from '../../shared/mock-data';

const cargaOctubre = 14_500;
const ingresosOctubre = 1_940_000;
const octoberReference = GERENTE_MONTHLY_BARS.at(-1)?.heightPct ?? 100;

// Convierte las alturas de la maqueta del equipo en una serie explícita de demostración.
export const gerenteMonthlyDemo = GERENTE_MONTHLY_BARS.map((point, index) => ({
  label: point.label,
  tonnes: Math.round((point.heightPct / octoberReference) * cargaOctubre),
  revenue: Math.round((point.heightPct / octoberReference) * ingresosOctubre),
  punctuality: GERENTE_PUNTUALIDAD_BARS[index].heightPct,
}));

export const gerenteAlertsDemo = GERENTE_RECENT_ALERTS.filter(
  (row) => row.badge === 'RETRASO CLIMA' || row.badge === 'MANTENIMIENTO',
);
