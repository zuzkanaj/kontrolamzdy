(function (root) {
  const ns = root.kontrolamzdy = root.kontrolamzdy || {};

  function extract(text, patterns, mode = 'number') {
    for (const p of patterns) {
      const m = text.match(p);
      if (m) return mode === 'time' ? ns.timeToHours(m[1]) : ns.normalizeNumber(m[1]);
    }
    return null;
  }

  function parsePayslipText(text) {
    const P = String(text || '').replace(/\r/g, ' ');
    const baseMatch = P.match(/Z[áa]kladn[yý][^\n]{0,35}?(\d+[,.]\d{1,2})\s*h?[^\d]{0,12}([\d\s]+[,.]\d{2})/i);
    const overMatch = P.match(/Za nad[cč]as[^\n]{0,30}?(\d+[,.]\d{1,2})\s*h?[^\d]{0,12}([\d\s]+[,.]\d{2})/i);
    const nightMatch = P.match(/\bNoc\b[^\n]{0,30}?(\d+[,.]\d{1,2})\s*h?[^\d]{0,12}([\d\s]+[,.]\d{2})/i);
    const vacMatch = P.match(/Dovolenka[^\n]{0,30}?(\d+[,.]\d{1,2})\s*d[^\d]{0,12}([\d\s]+[,.]\d{2})/i);
    const persMatch = P.match(/Osobn[yý][^\n]{0,30}?(\d+[,.]\d{1,2})\s*h?[^\d]{0,12}([\d\s]+[,.]\d{2})/i);
    const standbyMatch = P.match(/Neakt[^\n]{0,25}pohot[^\n]{0,25}?(\d+[,.]\d{1,2})\s*h?/i);

    return {
      workDays: extract(P, [/Pracovn[^\n]{0,15}fond[^\d]{0,10}(\d{1,2})\s*d/i]),
      tariff: extract(P, [/Tarifa[^\d]{0,12}([\d\s]+[,.]\d{2})/i]),
      personalMonthly: extract(P, [/Pr[ií]platok osobn[^\d]{0,15}([\d\s]+[,.]\d{2})/i]),
      otherMonthly: extract(P, [/Pr[ií]platky ostatn[^\d]{0,15}([\d\s]+[,.]\d{2})/i]),
      average: extract(P, [/Priemer pre n[áa]hrady[^\d]{0,15}([\d]+[,.]\d{3,4})/i]),
      baseHours: baseMatch ? ns.normalizeNumber(baseMatch[1]) : null,
      basicPaid: baseMatch ? ns.normalizeNumber(baseMatch[2]) : null,
      overtimeHoursPayslip: overMatch ? ns.normalizeNumber(overMatch[1]) : null,
      overtimePaid: overMatch ? ns.normalizeNumber(overMatch[2]) : null,
      nightHoursPayslip: nightMatch ? ns.normalizeNumber(nightMatch[1]) : null,
      nightPaid: nightMatch ? ns.normalizeNumber(nightMatch[2]) : null,
      vacationDaysPayslip: vacMatch ? ns.normalizeNumber(vacMatch[1]) : null,
      vacationPaid: vacMatch ? ns.normalizeNumber(vacMatch[2]) : null,
      personalPaid: persMatch ? ns.normalizeNumber(persMatch[2]) : null,
      standbyHoursPayslip: standbyMatch ? ns.normalizeNumber(standbyMatch[1]) : null,
      otherPaid: null
    };
  }

  Object.assign(ns, {
    extract,
    parsePayslipText
  });
})(window);
