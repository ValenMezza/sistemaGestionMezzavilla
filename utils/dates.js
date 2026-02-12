function startOfISOWeek(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // lunes=0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

function endOfISOWeek(date) {
  const s = startOfISOWeek(date);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

function formatISODate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function weekdaysFromWeekStart(weekStartDate) {
  const ws = new Date(weekStartDate);
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(ws);
    d.setDate(ws.getDate() + i);
    return {
      date: formatISODate(d),
      label: d.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: '2-digit' })
    };
  });
}

// Genera semanas (lunes->domingo) que "tocan" el mes seleccionado.
// month1Based: 1..12
function weeksForMonth(year, month1Based) {
  const monthIndex = month1Based - 1;
  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0); // último día del mes

  // arrancamos desde el lunes de la semana que contiene el 1 del mes
  let cursor = startOfISOWeek(monthStart);

  const weeks = [];
  while (cursor <= monthEnd) {
    const ws = new Date(cursor);
    const we = endOfISOWeek(ws);

    // la semana entra si intersecta el mes
    const intersects =
      we >= monthStart && ws <= monthEnd;

    if (intersects) {
      weeks.push({
        weekStart: formatISODate(ws),
        weekEnd: formatISODate(we)
      });
    }

    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() + 7);
  }

  // etiquetar "Semana N (dd al dd)"
  const labeled = weeks.map((w, idx) => ({
    ...w,
    label: `Semana ${idx + 1} (${w.weekStart} al ${w.weekEnd})`
  }));

  return labeled;
}

module.exports = {
  startOfISOWeek,
  endOfISOWeek,
  formatISODate,
  weekdaysFromWeekStart,
  weeksForMonth
};
