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
  { title:'Dochádzka', fields:[
    ['overtimeHoursAttendance','Nadčas podľa dochádzky','hod.'],
    ['nightHoursAttendance','Nočné hodiny podľa dochádzky','hod.'],
    ['vacationHoursAttendance','Dovolenka podľa dochádzky','hod.'],
    ['standbyHoursAttendance','Pohotovosť podľa dochádzky','hod.']
  ]},
  { title:'Výplatná páska – vstupné údaje', fields:[
    ['workDays','Pracovný fond','dní'],
    ['tariff','Tarifa','€'],
    ['personalMonthly','Osobný príplatok mesačne','€'],
    ['otherMonthly','Ostatné príplatky mesačne','€'],
    ['average','Priemer pre náhrady','€/hod.']
  ]},
  { title:'Výplatná páska – vykázané hodiny a sumy', fields:[
    ['baseHours','Základné platené hodiny','hod.'],
    ['basicPaid','Vyplatená základná mzda','€'],
    ['overtimeHoursPayslip','Nadčas podľa pásky','hod.'],
    ['overtimePaid','Vyplatená mzda za nadčas','€'],
    ['nightHoursPayslip','Nočné podľa pásky','hod.'],
    ['nightPaid','Vyplatený nočný príplatok','€'],
    ['vacationDaysPayslip','Dovolenka podľa pásky','dní'],
    ['vacationPaid','Vyplatená náhrada za dovolenku','€'],
    ['personalPaid','Vyplatený osobný príplatok','€'],
    ['otherPaid','Vyplatené ostatné pravidelné príplatky','€'],
    ['standbyHoursPayslip','Pohotovosť podľa pásky','hod.']
  ]}
];
const allFields = groups.flatMap(g => g.fields);
let values = {}, rawAttendance = '', rawPayslip = '';

function normalizeNumber(s){
  if(s == null || String(s).trim()==='') return null;
  const n = String(s).replace(/\s/g,'').replace(',', '.').replace(/[^0-9.\-]/g,'');
  const parsed = Number.parseFloat(n);
  return Number.isFinite(parsed) ? parsed : null;
}
function timeToHours(s){
  if(!s) return null;
  const m = String(s).match(/(\d{1,3})\s*[:.]\s*(\d{2})/);
  return m ? Number(m[1]) + Number(m[2])/60 : normalizeNumber(s);
}
function extract(text, patterns, mode='number'){
  for(const p of patterns){
    const m=text.match(p);
    if(m) return mode==='time'?timeToHours(m[1]):normalizeNumber(m[1]);
  }
  return null;
}
function parseDocuments(att, pay){
  const A=att.replace(/\r/g,' '), P=pay.replace(/\r/g,' ');
  const baseMatch=P.match(/Z[áa]kladn[yý][^\n]{0,35}?(\d+[,.]\d{1,2})\s*h?[^\d]{0,12}([\d\s]+[,.]\d{2})/i);
  const overMatch=P.match(/Za nad[cč]as[^\n]{0,30}?(\d+[,.]\d{1,2})\s*h?[^\d]{0,12}([\d\s]+[,.]\d{2})/i);
  const nightMatch=P.match(/\bNoc\b[^\n]{0,30}?(\d+[,.]\d{1,2})\s*h?[^\d]{0,12}([\d\s]+[,.]\d{2})/i);
  const vacMatch=P.match(/Dovolenka[^\n]{0,30}?(\d+[,.]\d{1,2})\s*d[^\d]{0,12}([\d\s]+[,.]\d{2})/i);
  const persMatch=P.match(/Osobn[yý][^\n]{0,30}?(\d+[,.]\d{1,2})\s*h?[^\d]{0,12}([\d\s]+[,.]\d{2})/i);
  const standbyMatch=P.match(/Neakt[^\n]{0,25}pohot[^\n]{0,25}?(\d+[,.]\d{1,2})\s*h?/i);
  return {
    workDays:extract(P,[/Pracovn[^\n]{0,15}fond[^\d]{0,10}(\d{1,2})\s*d/i]),
    tariff:extract(P,[/Tarifa[^\d]{0,12}([\d\s]+[,.]\d{2})/i]),
    personalMonthly:extract(P,[/Pr[ií]platok osobn[^\d]{0,15}([\d\s]+[,.]\d{2})/i]),
    otherMonthly:extract(P,[/Pr[ií]platky ostatn[^\d]{0,15}([\d\s]+[,.]\d{2})/i]),
    average:extract(P,[/Priemer pre n[áa]hrady[^\d]{0,15}([\d]+[,.]\d{3,4})/i]),
    baseHours:baseMatch?normalizeNumber(baseMatch[1]):null,
    basicPaid:baseMatch?normalizeNumber(baseMatch[2]):null,
    overtimeHoursPayslip:overMatch?normalizeNumber(overMatch[1]):null,
    overtimePaid:overMatch?normalizeNumber(overMatch[2]):null,
    nightHoursPayslip:nightMatch?normalizeNumber(nightMatch[1]):null,
    nightPaid:nightMatch?normalizeNumber(nightMatch[2]):null,
    vacationDaysPayslip:vacMatch?normalizeNumber(vacMatch[1]):null,
    vacationPaid:vacMatch?normalizeNumber(vacMatch[2]):null,
    personalPaid:persMatch?normalizeNumber(persMatch[2]):null,
    standbyHoursPayslip:standbyMatch?normalizeNumber(standbyMatch[1]):null,
    overtimeHoursAttendance:extract(A,[/PR[IÍ]SLU[ŽZ]BA[^\n]{0,35}(\d{1,3}:\d{2})/i,/Pohotovos[^\n]{0,30}sum[áa]r[^\d]{0,15}(\d{1,3}:\d{2})/i], 'time'),
    standbyHoursAttendance:extract(A,[/Pohotovos[^\n]{0,30}sum[áa]r[^\d]{0,15}(\d{1,3}:\d{2})/i], 'time'),
    nightHoursAttendance:extract(A,[/Pr[ií]platok no[cč]n[áa][^\d]{0,15}(\d{1,3}:\d{2})/i], 'time'),
    vacationHoursAttendance:extract(A,[/Dovolenka[^\d]{0,15}(\d{1,3}:\d{2})/i], 'time'),
    otherPaid:null
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
function setProgress(p,t){ $('progressBar').style.width=`${Math.max(0,Math.min(100,p))}%`; $('progressText').textContent=t; }
function renderFields(){
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
  values={workDays:22,tariff:4541.52,personalMonthly:200,otherMonthly:42,baseHours:147.83,overtimeHoursAttendance:35,overtimeHoursPayslip:35,nightHoursAttendance:25,nightHoursPayslip:25,vacationHoursAttendance:15,vacationDaysPayslip:2,average:34.1413,basicPaid:4068.92,overtimePaid:1014.69,vacationPaid:512.12,personalPaid:179.19,otherPaid:37.63,nightPaid:181.19,standbyHoursAttendance:35,standbyHoursPayslip:35};
  renderFields(); $('resultCard').classList.add('hidden');
};
function money(n){return new Intl.NumberFormat('sk-SK',{style:'currency',currency:'EUR'}).format(n)}
function row(name,expected,actual,tolerance=0.05,note=''){
  const diff=actual-expected, ok=Math.abs(diff)<=tolerance;
  return {name,expected,actual,diff,status:ok?'ok':'bad',label:ok?'Sedí':'Nesedí',note};
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
  const fundHours=values.workDays*7.5;
  const regularHourly=fundHours? (values.tariff+values.personalMonthly+values.otherMonthly)/fundHours : 0;
  const checks=[];
  checks.push(row('Nadčas – počet hodín',values.overtimeHoursAttendance,values.overtimeHoursPayslip,0.02,'Dochádzka vs. páska'));
  checks.push(row('Nočná práca – počet hodín',values.nightHoursAttendance,values.nightHoursPayslip,0.02,'Dochádzka vs. páska'));
  checks.push(row('Dovolenka – počet hodín',values.vacationHoursAttendance,values.vacationDaysPayslip*7.5,0.02,'1 deň = 7,5 hodiny'));
  checks.push(row('Pohotovosť – počet hodín',values.standbyHoursAttendance,values.standbyHoursPayslip,0.02,'Dochádzka vs. páska'));
  checks.push(row('Základná mzda',values.tariff/fundHours*values.baseHours,values.basicPaid,0.15,'Tarifa krátená podľa platených hodín'));
  checks.push(row('Osobný príplatok',values.personalMonthly/fundHours*values.baseHours,values.personalPaid,0.15,'Mesačný príplatok krátený podľa platených hodín'));
  if(values.otherPaid>0) checks.push(row('Ostatné pravidelné príplatky',values.otherMonthly/fundHours*values.baseHours,values.otherPaid,0.15,'Pravidelný mesačný príplatok'));
  checks.push(row('Mzda za nadčas',regularHourly*values.overtimeHoursPayslip,values.overtimePaid,0.15,'Tarifa + pravidelné príplatky, prepočítané na hodinu'));
  checks.push(row('Náhrada za dovolenku',values.average*values.vacationHoursAttendance,values.vacationPaid,0.15,'Priemer pre náhrady × hodiny dovolenky'));
  const bad=checks.filter(x=>x.status==='bad');
  const moneyChecks=bad.filter(x=>!x.name.includes('počet hodín'));
  const totalDiff=moneyChecks.reduce((a,b)=>a+b.diff,0);
  const verdict=$('verdict'); verdict.className='verdict '+(bad.length===0?'ok':bad.length<=2?'warn':'bad');
  verdict.innerHTML=`<h2>${bad.length===0?'Kontrolované položky sedia':'Našli sme '+bad.length+' nezrovnalosti'}</h2><p>${bad.length===0?'V rozsahu, ktorý táto verzia dokáže overiť, je výpočet správny.':`Súčet rozdielov pri peňažných položkách: <strong>${money(totalDiff)}</strong>.`}</p>`;
  $('results').innerHTML=checks.map(x=>`<div class="result-row"><strong>${x.name}<br><small>${x.note}</small></strong><span>Očakávané<br><b>${x.name.includes('počet hodín')?x.expected.toFixed(2)+' h':money(x.expected)}</b></span><span>Na páske<br><b>${x.name.includes('počet hodín')?x.actual.toFixed(2)+' h':money(x.actual)}</b></span><span class="status ${x.status}">${x.label}${x.status==='bad'?`<br>${x.name.includes('počet hodín')?x.diff.toFixed(2)+' h':money(x.diff)}`:''}</span></div>`).join('');
  $('resultCard').classList.remove('hidden'); $('resultCard').scrollIntoView({behavior:'smooth'});
};
