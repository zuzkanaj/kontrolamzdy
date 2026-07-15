(function (root) {
  const ns = root.kontrolamzdy = root.kontrolamzdy || {};

  function money(n) {
    return new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(n);
  }

  function row(name, expected, actual, tolerance = 0.05, note = '') {
    const invalid = !Number.isFinite(expected) || !Number.isFinite(actual);
    const diff = invalid ? NaN : actual - expected;
    const ok = invalid ? false : Math.abs(diff) <= tolerance;
    return {
      name,
      expected,
      actual,
      diff,
      status: invalid ? 'unknown' : ok ? 'ok' : 'bad',
      label: invalid ? 'Nedá sa overiť – chýba údaj' : ok ? 'Sedí' : 'Nesedí',
      note
    };
  }

  function buildResultSummary(values) {
    const fundHours = values.workDaysHours || (values.workDays ? values.workDays * 7.5 : 0);
    const regularHourly = fundHours ? (values.tariff + (values.personalMonthly || 0) + (values.otherMonthly || 0)) / fundHours : 0;
    const checks = [];

    checks.push(row('Nadčas – počet hodín', values.overtimeHoursAttendance, values.overtimeHoursPayslip, 0.02, 'Dochádzka vs. páska'));
    checks.push(row('Nočná práca – počet hodín', values.nightHoursAttendance, values.nightHoursPayslip, 0.02, 'Dochádzka vs. páska'));
    checks.push(row('Dovolenka – počet hodín', values.vacationHoursAttendance, values.vacationDaysPayslip * 7.5, 0.02, '1 deň = 7,5 hodiny'));
    checks.push(row('Pohotovosť – počet hodín', values.standbyHoursAttendance, values.standbyHoursPayslip, 0.02, 'Dochádzka vs. páska'));
    checks.push(row('Základná mzda', values.tariff / fundHours * values.baseHours, values.basicPaid, 0.15, 'Tarifa krátená podľa platených hodín'));
    checks.push(row('Osobný príplatok', (values.personalMonthly || 0) / fundHours * values.baseHours, values.personalPaid, 0.15, 'Mesačný príplatok krátený podľa platených hodín'));
    if (values.otherPaid > 0) checks.push(row('Ostatné pravidelné príplatky', (values.otherMonthly || 0) / fundHours * values.baseHours, values.otherPaid, 0.15, 'Pravidelný mesačný príplatok'));
    checks.push(row('Mzda za nadčas', regularHourly * values.overtimeHoursPayslip, values.overtimePaid, 0.15, 'Tarifa + pravidelné príplatky, prepočítané na hodinu'));
    checks.push(row('Náhrada za dovolenku', values.average * values.vacationHoursAttendance, values.vacationPaid, 0.15, 'Priemer pre náhrady × hodiny dovolenky'));

    const bad = checks.filter((x) => x.status === 'bad');
    const unknown = checks.filter((x) => x.status === 'unknown');
    const moneyChecks = bad.filter((x) => !x.name.includes('počet hodín'));
    const totalDiff = moneyChecks.reduce((a, b) => a + (Number.isFinite(b.diff) ? b.diff : 0), 0);
    const verdictClass = 'verdict ' + (bad.length === 0 ? (unknown.length === 0 ? 'ok' : 'warn') : bad.length <= 2 ? 'warn' : 'bad');
    const verdictHtml = `<h2>${bad.length === 0 ? (unknown.length === 0 ? 'Kontrolované položky sedia' : 'Niektoré položky sa nedajú overiť') : 'Našli sme ' + bad.length + ' nezrovnalosti'}</h2><p>${bad.length === 0 ? (unknown.length === 0 ? 'V rozsahu, ktorý táto verzia dokáže overiť, je výpočet správny.' : 'Niektoré riadky obsahujú neúplné údaje a nedajú sa bezpečne overiť.') : `Súčet rozdielov pri peňažných položkách: <strong>${money(totalDiff)}</strong>.`}</p>`;
    const formatValue = (value, isHours) => {
      if(!Number.isFinite(value)) return 'Nedá sa overiť – chýba údaj';
      return isHours ? value.toFixed(2) + ' h' : money(value);
    };
    const resultsHtml = checks.map((x) => `<div class="result-row"><strong>${x.name}<br><small>${x.note}</small></strong><span>Očakávané<br><b>${x.name.includes('počet hodín') ? formatValue(x.expected, true) : formatValue(x.expected, false)}</b></span><span>Na páske<br><b>${x.name.includes('počet hodín') ? formatValue(x.actual, true) : formatValue(x.actual, false)}</b></span><span class="status ${x.status}">${x.label}${x.status === 'bad' ? `<br>${x.name.includes('počet hodín') ? formatValue(x.diff, true) : formatValue(x.diff, false)}` : ''}</span></div>`).join('');

    return {
      checks,
      bad,
      totalDiff,
      verdictClass,
      verdictHtml,
      resultsHtml
    };
  }

  Object.assign(ns, {
    money,
    row,
    buildResultSummary
  });
})(window);
