(function (root) {
  const ns = root.kontrolamzdy = root.kontrolamzdy || {};

  function setProgress(progress, text) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    if (progressBar) progressBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
    if (progressText) progressText.textContent = text;
  }

  function renderFields(groups, values, rawAttendance, rawPayslip) {
    let missing = 0;
    document.getElementById('fields').innerHTML = groups.map((group) => {
      const fields = group.fields.map(([key, label, unit]) => {
        const val = values[key];
        const isMissing = val === null || val === undefined;
        if (isMissing) missing++;
        return `<div class="field ${isMissing ? 'missing' : ''}">
          <label for="f_${key}">${label}</label>
          <div class="input-row"><input id="f_${key}" type="number" step="0.01" value="${isMissing ? '' : Number(val).toFixed(2)}" placeholder="Doplňte"><span>${unit}</span></div>
          <small>${isMissing ? 'Nepodarilo sa prečítať – doplňte ručne' : 'Načítané z dokumentu'}</small>
        </div>`;
      }).join('');
      return `<section class="field-group"><h3>${group.title}</h3><div class="fields">${fields}</div></section>`;
    }).join('');

    const missingNotice = document.getElementById('missingNotice');
    missingNotice.classList.toggle('hidden', missing === 0);
    missingNotice.textContent = missing ? `Chýba ${missing} hodnôt. Pred kontrolou ich doplňte podľa dokumentov.` : '';
    document.getElementById('rawAttendance').textContent = rawAttendance;
    document.getElementById('rawPayslip').textContent = rawPayslip;
    const confirmCard = document.getElementById('confirmCard');
    confirmCard.classList.remove('hidden');
    confirmCard.scrollIntoView({ behavior: 'smooth' });
  }

  Object.assign(ns, {
    setProgress,
    renderFields
  });
})(window);
