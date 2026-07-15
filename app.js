const PASSWORD = 'gynpo1';
const $ = (id) => document.getElementById(id);
const login = $('login'), app = $('app');

$('loginBtn').onclick = loginUser;
$('password').addEventListener('keydown', e => { if (e.key === 'Enter') loginUser(); });
function loginUser(){
  if ($('password').value === PASSWORD) {
    sessionStorage.setItem('km_auth', '1');
    login.classList.add('hidden'); app.classList.remove('hidden');
  } else $('loginError').classList.remove('hidden');
}
$('logoutBtn').onclick = () => { sessionStorage.removeItem('km_auth'); location.reload(); };
if (sessionStorage.getItem('km_auth') === '1') { login.classList.add('hidden'); app.classList.remove('hidden'); }

function updateAttendanceFileList(){
  const files = $('attendanceFile').files;
  const list = $('attendanceList');
  if(!files || files.length===0){
    list.innerHTML='';
    return;
  }
  const items = Array.from(files).map(f=>`<div class="file-item">${f.name}</div>`).join('');
  list.innerHTML=`${items}<div class="file-count">${files.length} súbor${files.length===1?'':'y'}</div>`;
}
$('attendanceFile').addEventListener('change', updateAttendanceFileList);

const groups = [
  { title:'Dochádzka – údaje z výkazu', fields:[
    ['workDaysHours','Pracovný fond','hod.'],
    ['baseHours','Odpracované hodiny','hod.'],
    ['overtimeHoursAttendance','Nadčasové hodiny','hod.'],
    ['nightHoursAttendance','Nočné hodiny','hod.'],
    ['standbyHoursAttendance','Pohotovosť na pracovisku','hod.'],
    ['vacationHoursAttendance','Dovolenka','hod.']
  ]},
  { title:'Výplatná páska – údaje na overenie', fields:[
    ['tariff','Tarifa','€'],
    ['average','Priemer pre náhrady','€/hod.'],
    ['basicPaid','Základná mzda','€'],
    ['overtimePaid','Mzda za nadčas','€'],
    ['overtimeHoursPayslip','Nadčasový príplatok – hodiny','hod.'],
    ['nightPaid','Nočný príplatok','€'],
    ['standbyHoursPayslip','Neaktívna pohotovosť – hodiny','hod.'],
    ['vacationPaid','Náhrada za dovolenku','€']
  ]}
];
const allFields = groups.flatMap(g => g.fields);
let values = {}, rawAttendance = '', rawPayslip = '';

const ns = window.kontrolamzdy || {};
const normalizeNumber = ns.normalizeNumber || function(s){
  if(s == null || String(s).trim()==='') return null;
  const n = String(s).replace(/\s/g,'').replace(',', '.').replace(/[^0-9.\-]/g,'');
  const parsed = Number.parseFloat(n);
  return Number.isFinite(parsed) ? parsed : null;
};
const timeToHours = ns.timeToHours || function(s){
  if(!s) return null;
  const m = String(s).match(/(\d{1,3})\s*[:.]\s*(\d{2})/);
  return m ? Number(m[1]) + Number(m[2])/60 : normalizeNumber(s);
};
const extract = ns.extract || function(text, patterns, mode='number'){
  for(const p of patterns){
    const m=text.match(p);
    if(m) return mode==='time'?timeToHours(m[1]):normalizeNumber(m[1]);
  }
  return null;
};
function parseDocuments(att, pay){
  return {
    ...ns.parseAttendanceText ? ns.parseAttendanceText(att) : {},
    ...ns.parsePayslipText ? ns.parsePayslipText(pay) : {}
  };
}

async function fileToImages(file){
  if(file.type==='application/pdf' || file.name.toLowerCase().endsWith('.pdf')){
    const pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';
    const pdf=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise;
    const images=[];
    for(let i=1;i<=pdf.numPages;i++){
      const page=await pdf.getPage(i), viewport=page.getViewport({scale:2.3});
      const canvas=document.createElement('canvas'); canvas.width=viewport.width; canvas.height=viewport.height;
      await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
      images.push(await compressImage(canvas.toDataURL('image/png')));
    }
    return images;
  }
  const url = URL.createObjectURL(file);
  const compressed = await compressImage(url);
  return [compressed];
}
async function compressImage(dataUrl){
  return new Promise((resolve)=>{
    const img = new Image();
    img.onload = () => {
      const MAX_DIMENSION = 1800;
      const maxSize = Math.max(img.width, img.height);
      if(maxSize <= MAX_DIMENSION){
        resolve(dataUrl);
        return;
      }
      const scale = MAX_DIMENSION / maxSize;
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.87));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
function withTimeout(promise, ms){
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout po ' + ms + 'ms')), ms))
  ]);
}
async function ocrFile(file, label, start, span){
  const images=await fileToImages(file); let text='';
  for(let i=0;i<images.length;i++){
    const result=await withTimeout(
      Tesseract.recognize(images[i],'eng',{logger:m=>{
        if(m.status==='recognizing text') setProgress(start+span*((i+m.progress)/images.length),`${label}: čítam stranu ${i+1}/${images.length}`);
      }}),
      45000
    );
    text+='\n'+result.data.text;
  }
  return text;
}
async function processMultipleAttendanceFiles(fileList, startProgress, totalSpan){
  let combinedText = '';
  const totalFiles = fileList.length;
  const errors = [];
  for(let fileIndex=0; fileIndex<totalFiles; fileIndex++){
    try{
      const file = fileList[fileIndex];
      const fileSpan = totalSpan / totalFiles;
      const fileStart = startProgress + (fileIndex * fileSpan);
      const fileName = file.name;
      setProgress(fileStart, `📄 ${fileName} | Spracúvam ${fileIndex+1}/${totalFiles}...`);
      const text = await ocrFile(file, `Dochádzka (${fileIndex+1}/${totalFiles})`, fileStart, fileSpan);
      combinedText += '\n' + text;
    }catch(e){
      const err = `Súbor "${fileList[fileIndex].name}": ${e.message}`;
      console.error(err);
      errors.push(err);
    }
  }
  if(errors.length > 0){
    throw new Error('Chyby pri spracovaní:\n' + errors.join('\n'));
  }
  return combinedText;
}
function setProgress(p,t){ ns.setProgress ? ns.setProgress(p,t) : ($('progressBar').style.width=`${Math.max(0,Math.min(100,p))}%`, $('progressText').textContent=t); }
function renderFields(){
  ns.renderFields ? ns.renderFields(groups, values, rawAttendance, rawPayslip) : (()=>{
    let missing=0;
    $('fields').innerHTML=groups.map(group=>{
      const fields=group.fields.map(([key,label,unit])=>{
        const val=values[key]; const isMissing=val===null || val===undefined;
        if(isMissing) missing++;
        return `<div class="field ${isMissing?'missing':''}">
          <label for="f_${key}">${label}</label>
          <div class="input-row"><input id="f_${key}" type="number" step="0.01" value="${isMissing?'':Number(val).toFixed(2)}" placeholder="Doplňte"><span>${unit}</span></div>
          <small>${isMissing?'Nepodarilo sa prečítať – doplňte ručne':'Načítané z dokumentu'}</small>
        </div>`;
      }).join('');
      return `<section class="field-group"><h3>${group.title}</h3><div class="fields">${fields}</div></section>`;
    }).join('');
    $('missingNotice').classList.toggle('hidden', missing===0);
    $('missingNotice').textContent = missing ? `Chýba ${missing} hodnôt. Pred kontrolou ich doplňte podľa dokumentov.` : '';
    $('rawAttendance').textContent=rawAttendance;
    $('rawPayslip').textContent=rawPayslip;
    $('confirmCard').classList.remove('hidden');
    $('confirmCard').scrollIntoView({behavior:'smooth'});
  })();
}
function resetAnalysis(){
  $('progressCard').classList.add('hidden');
  $('confirmCard').classList.add('hidden');
  $('resultCard').classList.add('hidden');
  $('errorCard').classList.add('hidden');
  $('attendanceFile').value='';
  $('payslipFile').value='';
  updateAttendanceFileList();
  values={};
  rawAttendance='';
  rawPayslip='';
}
$('analyzeBtn').onclick=async()=>{
  const afFiles = Array.from($('attendanceFile').files);
  const pf = $('payslipFile').files[0];
  if(afFiles.length===0 || !pf){alert('Nahrajte aspoň jednu dochádzku a výplatnú pásku.');return;}
  $('progressCard').classList.remove('hidden'); 
  $('confirmCard').classList.add('hidden'); 
  $('resultCard').classList.add('hidden');
  $('errorCard').classList.add('hidden');
  try{
    setProgress(2, 'Pripravujem dochádzky…');
    rawAttendance = await processMultipleAttendanceFiles(afFiles, 3, 45);
    setProgress(50, 'Pripravujem výplatnú pásku…');
    rawPayslip = await ocrFile(pf, 'Výplatná páska', 50, 45);
    values = parseDocuments(rawAttendance, rawPayslip);
    setProgress(100, 'Hotovo. Skontrolujte načítané hodnoty.');
    setTimeout(()=>{$('progressCard').classList.add('hidden');renderFields();}, 350);
  }catch(e){
    console.error(e);
    $('progressCard').classList.add('hidden');
    $('errorCard').classList.remove('hidden');
    $('errorMessage').textContent = e.message || 'Dokument sa nepodarilo spracovať. Skúste kvalitnejšiu fotografiu.';
    $('errorCard').scrollIntoView({behavior:'smooth'});
  }
};
$('retryBtn').onclick = () => {
  resetAnalysis();
};
$('continueBtn').onclick = () => {
  $('errorCard').classList.add('hidden');
  renderFields();
};
$('demoBtn').onclick=()=>{
  rawAttendance='Demo údaje – jún 2026'; rawPayslip='Demo údaje – jún 2026';
  values={
    workDaysHours:165,
    baseHours:147.83,
    overtimeHoursAttendance:35,
    nightHoursAttendance:25,
    standbyHoursAttendance:35,
    vacationHoursAttendance:15,
    tariff:4541.52,
    average:34.1413,
    basicPaid:4068.92,
    overtimePaid:1014.69,
    overtimeHoursPayslip:35,
    nightPaid:181.19,
    standbyHoursPayslip:35,
    vacationPaid:512.12,
    personalMonthly:200,
    otherMonthly:42,
    personalPaid:179.19,
    otherPaid:37.63,
    vacationDaysPayslip:2
  };
  renderFields(); $('resultCard').classList.add('hidden');
};
function money(n){ return ns.money ? ns.money(n) : new Intl.NumberFormat('sk-SK',{style:'currency',currency:'EUR'}).format(n); }
function row(name,expected,actual,tolerance=0.05,note=''){
  return ns.row ? ns.row(name,expected,actual,tolerance,note) : (()=>{
    const diff=actual-expected, ok=Math.abs(diff)<=tolerance;
    return {name,expected,actual,diff,status:ok?'ok':'bad',label:ok?'Sedí':'Nesedí',note};
  })();
}
$('calculateBtn').onclick=()=>{
  const btnText = $('calculateBtn').textContent;
  $('calculateBtn').disabled = true;
  $('calculateBtn').textContent = '⏳ Spracúvam...';
  $('missingNotice').classList.add('hidden');
  $('missingNotice').textContent = '';
  
  const requiredFields = new Set([
    'workDaysHours','baseHours','overtimeHoursAttendance','nightHoursAttendance',
    'standbyHoursAttendance','vacationHoursAttendance','tariff','average','basicPaid',
    'overtimePaid','overtimeHoursPayslip','nightPaid','standbyHoursPayslip','vacationPaid'
  ]);
  const optionalFields = new Set(['otherPaid','personalMonthly','otherMonthly','personalPaid','vacationDaysPayslip']);
  let errorCount = 0;
  let firstInvalidField = null;
  
  for(const [key,label] of allFields){
    const input = $(`f_${key}`);
    if(!input){
      console.warn(`Pole ${key} nemá vstupný prvok`);
      continue;
    }
    const rawValue = input.value.trim();
    const val = normalizeNumber(rawValue);
    values[key] = val;
    const fieldContainer = input.closest('.field');
    const helperText = fieldContainer ? fieldContainer.querySelector('small') : null;
    if(fieldContainer){
      fieldContainer.classList.remove('invalid', 'missing');
    }
    if(helperText){
      helperText.textContent = '';
    }
    if(rawValue === ''){
      if(requiredFields.has(key)){
        errorCount++;
        if(fieldContainer){
          fieldContainer.classList.add('invalid');
        }
        if(helperText) helperText.textContent = 'Chýba hodnota';
        if(!firstInvalidField && fieldContainer) firstInvalidField = fieldContainer;
      }
      if(optionalFields.has(key)){
        values[key] = null;
      }
    } else if(val === null){
      if(requiredFields.has(key)){
        errorCount++;
        if(fieldContainer){
          fieldContainer.classList.add('invalid');
        }
        if(helperText) helperText.textContent = 'Neplatné číslo';
        if(!firstInvalidField && fieldContainer) firstInvalidField = fieldContainer;
      } else {
        if(fieldContainer){
          fieldContainer.classList.add('invalid');
        }
        if(helperText) helperText.textContent = 'Neplatné číslo';
        values[key] = null;
      }
    }
  }
  
  if(errorCount){
    $('calculateBtn').disabled = false;
    $('calculateBtn').textContent = btnText;
    const formWord = errorCount === 1 ? 'pole' : (errorCount <= 4 ? 'polia' : 'polí');
    $('missingNotice').classList.remove('hidden');
    $('missingNotice').textContent = `Skontrolujte ${errorCount} ${formWord}`;
    if(firstInvalidField){
      firstInvalidField.scrollIntoView({behavior:'smooth', block:'center'});
    } else {
      $('confirmCard').scrollIntoView({behavior:'smooth'});
    }
    return;
  }
  
  const summary = ns.buildResultSummary ? ns.buildResultSummary(values) : null;
  const checks = summary ? summary.checks : [];
  const bad = summary ? summary.bad : [];
  const totalDiff = summary ? summary.totalDiff : 0;
  
  const verdict = $('verdict');
  verdict.className = summary ? summary.verdictClass : ('verdict '+(bad.length===0?'ok':bad.length<=2?'warn':'bad'));
  verdict.innerHTML = summary ? summary.verdictHtml : `<h2>${bad.length===0?'Kontrolované položky sedia':'Našli sme '+bad.length+' nezrovnalosti'}</h2><p>${bad.length===0?'V rozsahu, ktorý táto verzia dokáže overiť, je výpočet správny.':`Súčet rozdielov pri peňažných položkách: <strong>${money(totalDiff)}</strong>.`}</p>`;
  $('results').innerHTML = summary ? summary.resultsHtml : checks.map(x=>`<div class="result-row"><strong>${x.name}<br><small>${x.note}</small></strong><span>Očakávané<br><b>${x.name.includes('počet hodín')?x.expected.toFixed(2)+' h':money(x.expected)}</b></span><span>Na páske<br><b>${x.name.includes('počet hodín')?x.actual.toFixed(2)+' h':money(x.actual)}</b></span><span class="status ${x.status}">${x.label}${x.status==='bad'?`<br>${x.name.includes('počet hodín')?x.diff.toFixed(2)+' h':money(x.diff)}`:''}</span></div>`).join('');
  
  $('confirmCard').classList.add('hidden');
  $('resultCard').classList.remove('hidden');
  $('resultCard').scrollIntoView({behavior:'smooth'});
  
  $('calculateBtn').disabled = false;
  $('calculateBtn').textContent = '✓ Výpočet hotový';
  setTimeout(()=>{ $('calculateBtn').textContent = btnText; }, 2000);
};
