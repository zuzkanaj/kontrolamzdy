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
      images.push(canvas.toDataURL('image/png'));
    }
    return images;
  }
  return [URL.createObjectURL(file)];
}
async function ocrFile(file, label, start, span){
  const images=await fileToImages(file); let text='';
  for(let i=0;i<images.length;i++){
    const result=await Tesseract.recognize(images[i],'eng',{logger:m=>{
      if(m.status==='recognizing text') setProgress(start+span*((i+m.progress)/images.length),`${label}: čítam stranu ${i+1}/${images.length}`);
    }});
    text+='\n'+result.data.text;
  }
  return text;
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
$('analyzeBtn').onclick=async()=>{
  const af=$('attendanceFile').files[0], pf=$('payslipFile').files[0];
  if(!af||!pf){alert('Nahrajte oba dokumenty.');return;}
  $('progressCard').classList.remove('hidden'); $('confirmCard').classList.add('hidden'); $('resultCard').classList.add('hidden');
  try{
    setProgress(2,'Pripravujem dochádzku…');
    rawAttendance=await ocrFile(af,'Dochádzka',3,45);
    setProgress(50,'Pripravujem výplatnú pásku…');
    rawPayslip=await ocrFile(pf,'Výplatná páska',50,45);
    values=parseDocuments(rawAttendance,rawPayslip);
    setProgress(100,'Hotovo. Skontrolujte načítané hodnoty.');
    setTimeout(()=>{$('progressCard').classList.add('hidden');renderFields();},350);
  }catch(e){console.error(e);alert('Dokument sa nepodarilo spracovať. Skúste kvalitnejšiu fotografiu.');}
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
  const missing=[];
  for(const [key,label] of allFields){
    const input=$(`f_${key}`); values[key]=normalizeNumber(input.value);
    input.closest('.field').classList.toggle('missing', values[key]===null);
    if(values[key]===null && key!=='otherPaid') missing.push(label);
  }
  if(missing.length){
    $('missingNotice').classList.remove('hidden');
    $('missingNotice').textContent=`Doplňte chýbajúce údaje: ${missing.slice(0,4).join(', ')}${missing.length>4?'…':''}`;
    $('confirmCard').scrollIntoView({behavior:'smooth'}); return;
  }
  if(values.otherPaid===null) values.otherPaid=0;
  const summary = ns.buildResultSummary ? ns.buildResultSummary(values) : null;
  const checks = summary ? summary.checks : [];
  const bad = summary ? summary.bad : [];
  const totalDiff = summary ? summary.totalDiff : 0;
  const verdict=$('verdict'); verdict.className = summary ? summary.verdictClass : ('verdict '+(bad.length===0?'ok':bad.length<=2?'warn':'bad'));
  verdict.innerHTML = summary ? summary.verdictHtml : `<h2>${bad.length===0?'Kontrolované položky sedia':'Našli sme '+bad.length+' nezrovnalosti'}</h2><p>${bad.length===0?'V rozsahu, ktorý táto verzia dokáže overiť, je výpočet správny.':`Súčet rozdielov pri peňažných položkách: <strong>${money(totalDiff)}</strong>.`}</p>`;
  $('results').innerHTML = summary ? summary.resultsHtml : checks.map(x=>`<div class="result-row"><strong>${x.name}<br><small>${x.note}</small></strong><span>Očakávané<br><b>${x.name.includes('počet hodín')?x.expected.toFixed(2)+' h':money(x.expected)}</b></span><span>Na páske<br><b>${x.name.includes('počet hodín')?x.actual.toFixed(2)+' h':money(x.actual)}</b></span><span class="status ${x.status}">${x.label}${x.status==='bad'?`<br>${x.name.includes('počet hodín')?x.diff.toFixed(2)+' h':money(x.diff)}`:''}</span></div>`).join('');
  $('resultCard').classList.remove('hidden'); $('resultCard').scrollIntoView({behavior:'smooth'});
};
