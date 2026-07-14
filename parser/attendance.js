(function (root) {
  const ns = root.kontrolamzdy = root.kontrolamzdy || {};

  function normalizeNumber(s) {
    if (s == null || String(s).trim() === '') return null;
    const n = String(s).replace(/\s/g, '').replace(',', '.').replace(/[^0-9.\-]/g, '');
    const parsed = Number.parseFloat(n);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function timeToHours(s) {
    if (!s) return null;
    const m = String(s).match(/(\d{1,3})\s*[:.]\s*(\d{2})/);
    return m ? Number(m[1]) + Number(m[2]) / 60 : normalizeNumber(s);
  }

  function extract(text, patterns, mode = 'number') {
    for (const p of patterns) {
      const m = text.match(p);
      if (m) return mode === 'time' ? timeToHours(m[1]) : normalizeNumber(m[1]);
    }
    return null;
  }

  function parseAttendanceText(text) {
    const A = String(text || '').replace(/\r/g, ' ');
    return {
      workDaysHours: extract(A, [/Pracovn[^\n]{0,15}fond[^\d]{0,10}(\d{1,2})\s*[dh]/i]),
      overtimeHoursAttendance: extract(A, [/PR[IÍ]SLU[ŽZ]BA[^\n]{0,35}(\d{1,3}:\d{2})/i, /Pohotovos[^\n]{0,30}sum[áa]r[^\d]{0,15}(\d{1,3}:\d{2})/i], 'time'),
      standbyHoursAttendance: extract(A, [/Pohotovos[^\n]{0,30}sum[áa]r[^\d]{0,15}(\d{1,3}:\d{2})/i], 'time'),
      nightHoursAttendance: extract(A, [/Pr[ií]platok no[cč]n[áa][^\d]{0,15}(\d{1,3}:\d{2})/i], 'time'),
      vacationHoursAttendance: extract(A, [/Dovolenka[^\d]{0,15}(\d{1,3}:\d{2})/i], 'time')
    };
  }

  Object.assign(ns, {
    normalizeNumber,
    timeToHours,
    extract,
    parseAttendanceText
  });
})(window);
