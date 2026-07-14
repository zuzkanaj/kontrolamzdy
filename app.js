const PASSWORD = 'gynpo1';
const $ = (id) => document.getElementById(id);
const login = $('login'), app = $('app');

$('loginBtn').onclick = () => {
  if ($('password').value === PASSWORD) {
    sessionStorage.setItem('km_auth', '1');
    login.classList.add('hidden'); app.classList.remove('hidden');
  } else $('loginError').classList.remove('hidden');
};
$('logoutBtn').onclick = () => { sessionStorage.removeItem('km_auth'); location.reload(); };
if (sessionStorage.getItem('km_auth') === '1') { login.classList.add('hidden'); app.classList.remove('hidden'); }

const schema = [
  ['workDays','Pracovný fond – dni','days'],
  ['tariff','Tarifa','eur'],
  ['personalMonthly','Osobný príplatok mesačne','eur'],
  ['otherMonthly','Ostatné príplatky mesačne','eur'],
  ['baseHours','Základné platené hodiny','hours'],
  ['overtimeHoursAttendance','Nadčas podľa dochádzky','hours'],
  ['overtimeHoursPayslip','Nadčas podľa pásky','hours'],
  ['nightHoursAttendance','Nočné podľa dochádzky','hours'],
  ['nightHoursPayslip','Nočné podľa pásky','hours'],
  ['vacationHoursAttendance','Dovolenka podľa dochádzky','hours'],
  ['vacationDaysPayslip','Dovolenka podľa pásky – dni','days'],
  ['average','Priemer pre náhrady','eurh'],
  ['basicPaid','Vyplatená základná mzda','eur'],
  ['overtimePaid','Vyplatená mzda za nadčas','eur'],
  ['vacationPaid','Vyplatená náhrada za dovolenku','eur'],
  ['personalPaid','Vyplatený osobný príplatok','eur'],
  ['otherPaid','Vyplatené ostatné pravidelné príplatky','eur'],
  ['nightPaid','Vyplatený nočný príplatok','eur'],
  ['standbyHoursAttendance','Pohotovosť podľa dochádzky','hours'],
  ['standbyHoursPayslip','Pohotovosť podľa pásky','hours']
];

let values = {};
function normalizeNumber(s){
  if(s == null) return 0;
  const n = String(s).replace(/\s/g,'').replace(',', '.').replace(/[^0-9.\-]/g,'');
  return Number.parseFloat(n) || 0;
}
function timeToHours(s){
  if(!s) return 0;
  const m = String(s).match(/(\d{1,3})\s*[:.]\s*(\d{2})/);
  return m ? Number(m[1]) + Number(m[2])/60 : normalizeNumber(s);
}
function extract(text, patterns, mode='number'){
  for(const p of patterns){ const m=text.match(p); if(m) return mode==='time'?timeToHours(m[1]):normalizeNumber(m[1]); }
  return 0;
}
function parseDocuments(att, pay){
  const A=att.replace(/\r/g,' '), P=pay.replace(/\r/g,' ');
  const workDays=extract(P,[/Pracovn[^\n]{0,12}fond[^\d]{0,8}(\d{1,2})\s*d/i]);
  const tariff=extract(P,[/Tarifa[^\d]{0,10}([\d\s]+[,.]\d{2})/i]);
  const personalMonthly=extract(P,[/Priplatok osobn[^\d]{0,12}([\d\s]+[,.]\d{2})/i,/Príplatok osobný[^\d]{0,12}([\d\s]+[,.]\d{2})/i]);
  const otherMonthly=extract(P,[/Priplatky ostatn[^\d]{0,12}([\d\s]+[,.]\d{2})/i,/Príplatky ostatné[^\d]{0,12}([\d\s]+[,.]\d{2})/i]);
  const average=extract(P,[/Priemer pre nahrady[^\d]{0,12}([\d]+[,.]\d{3,4})/i,/Priemer pre náhrady[^\d]{0,12}([\d]+[,.]\d{3,4})/i]);
  const baseMatch=P.match(/Z[áa]kladn[yý][^\n]{0,30}?(\d+[,.]\d{1,2})\s*h?[^\d]{0,10}([\d\s]+[,.]\d{2})/i);
  const overMatch=P.match(/Za nad[cč]as[^\n]{0,25}?(\d+[,.]\d{1,2})\s*h?[^\d]{0,10}([\d\s]+[,.]\d{2})/i);
  const nightMatch=P.match(/\bNoc\b[^\n]{0,25}?(\d+[,.]\d{1,2})\s*h?[^\d]{0,10}([\d\s]+[,.]\d{2})/i);
  const vacMatch=P.match(/Dovolenka[^\n]{0,25}?(\d+[,.]\d{1,2})\s*d[^\d]{0,10}([\d\s]+[,.]\d{2})/i);
  const persMatch=P.match(/Osobn[yý][^\n]{0,25}?(\d+[,.]\d{1,2})\s*h?[^\d]{0,10}([\d\s]+[,.]\d{2})/i);
  const standbyMatch=P.match(/Neakt[^\n]{0,20}pohot[^\n]{0,20}?(\d+[,.]\d{1,2})\s*h?/i);
  return {
    workDays, tariff, personalMonthly, otherMonthly, average,
    baseHours:baseMatch?normalizeNumber(baseMatch[1]):0,
    basicPaid:baseMatch?normalizeNumber(baseMatch[2]):0,
    overtimeHoursPayslip:overMatch?normalizeNumber(overMatch[1]):0,
    overtimePaid:overMatch?normalizeNumber(overMatch[2]):0,
    nightHoursPayslip:nightMatch?normalizeNumber(nightMatch[1]):0,
    nightPaid:nightMatch?normalizeNumber(nightMatch[2]):0,
    vacationDaysPayslip:vacMatch?normalizeNumber(vacMatch[1]):0,
    vacationPaid:vacMatch?normalizeNumber(vacMatch[2]):0,
    personalPaid:persMatch?normalizeNumber(persMatch[2]):0,
    standbyHoursPayslip:standbyMatch?normalizeNumber(standbyMatch[1]):0,
    overtimeHoursAttendance:extract(A,[/Pohotovos[^\n]{0,25}sum[áa]r[^\d]{0,12}(\d{1,3}:\d{2})/i,/PRISLU[ŽZ]BA[^\n]{0,25}(\d{1,3}:\d{2})/i], 'time'),
    standbyHoursAttendance:extract(A,[/Pohotovos[^\n]{0,25}sum[áa]r[^\d]{0,12}(\d{1,3}:\d{2})/i], 'time'),
    nightHoursAttendance:extract(A,[/Pr[ií]platok no[cč]n[áa][^\d]{0,12}(\d{1,3}:\d{2})/i,/Celkom\s*\([^)]*\)[^\n]{0,100}?(\d{1,3}:\d{2})\s+[\d:.-]+\s*$/im], 'time'),
    vacationHoursAttendance:extract(A,[/Dovolenka[^\d]{0,12}(\d{1,3}:\d{2})/i], 'time'),
    otherPaid:0
  };
}

async function fileToImages(file){
  if(file.type==='application/pdf' || file.name.toLowerCase().endsWith('.pdf')){
    const pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';
    const pdf=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise;
    const images=[];
    for(let i=1;i<=pdf.numPages;i++){
      const page=await pdf.getPage(i), viewport=page.getViewport({scale:2});
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
  $('fields').innerHTML=schema.map(([key,label,unit])=>`<div class="field"><label for="f_${key}">${label}</label><input id="f_${key}" type="number" step="0.01" value="${Number(values[key]||0).toFixed(2)}"><small>${unit==='eur'?'€':unit==='eurh'?'€/hod.':unit==='hours'?'hodiny':'dni'}</small></div>`).join('');
  $('confirmCard').classList.remove('hidden');
}
$('analyzeBtn').onclick=async()=>{
  const af=$('attendanceFile').files[0], pf=$('payslipFile').files[0];
  if(!af||!pf){alert('Nahrajte oba dokumenty.');return;}
  $('progressCard').classList.remove('hidden'); $('confirmCard').classList.add('hidden'); $('resultCard').classList.add('hidden');
  try{
    setProgress(2,'Pripravujem dochádzku…');
    const at=await ocrFile(af,'Dochádzka',3,45);
    setProgress(50,'Pripravujem výplatnú pásku…');
    const pt=await ocrFile(pf,'Výplatná páska',50,45);
    values=parseDocuments(at,pt); setProgress(100,'Hotovo. Skontrolujte načítané hodnoty.'); renderFields();
  }catch(e){console.error(e);alert('Dokument sa nepodarilo spracovať. Skúste kvalitnejšiu fotografiu alebo použite demo.');}
};
$('demoBtn').onclick=()=>{
  values={workDays:22,tariff:4541.52,personalMonthly:200,otherMonthly:42,baseHours:147.83,overtimeHoursAttendance:35,overtimeHoursPayslip:35,nightHoursAttendance:25,nightHoursPayslip:25,vacationHoursAttendance:15,vacationDaysPayslip:2,average:34.1413,basicPaid:4068.92,overtimePaid:1014.69,vacationPaid:512.12,personalPaid:179.19,otherPaid:37.63,nightPaid:181.19,standbyHoursAttendance:35,standbyHoursPayslip:35};
  renderFields(); $('resultCard').classList.add('hidden');
};
function money(n){return new Intl.NumberFormat('sk-SK',{style:'currency',currency:'EUR'}).format(n)}
function row(name,expected,actual,tolerance=0.05,note=''){
  const diff=actual-expected, ok=Math.abs(diff)<=tolerance;
  return {name,expected,actual,diff,status:ok?'ok':'bad',label:ok?'Sedí':'Nesedí',note};
}
$('calculateBtn').onclick=()=>{
  for(const [key] of schema) values[key]=normalizeNumber($(`f_${key}`).value);
  const fundHours=values.workDays*7.5;
  const regularHourly=fundHours? (values.tariff+values.personalMonthly+values.otherMonthly)/fundHours : 0;
  const checks=[];
  checks.push(row('Nadčas – počet hodín',values.overtimeHoursAttendance,values.overtimeHoursPayslip,0.02,'Dochádzka vs. páska'));
  checks.push(row('Nočná práca – počet hodín',values.nightHoursAttendance,values.nightHoursPayslip,0.02,'Dochádzka vs. páska'));
  checks.push(row('Dovolenka – počet hodín',values.vacationHoursAttendance,values.vacationDaysPayslip*7.5,0.02,'1 deň = 7,5 hodiny'));
  checks.push(row('Pohotovosť – počet hodín',values.standbyHoursAttendance,values.standbyHoursPayslip,0.02,'Dochádzka vs. páska'));
  checks.push(row('Základná mzda',fundHours?values.tariff/fundHours*values.baseHours:0,values.basicPaid,0.15,'Tarifa krátená podľa platených hodín'));
  checks.push(row('Osobný príplatok',fundHours?values.personalMonthly/fundHours*values.baseHours:0,values.personalPaid,0.15,'Mesačný príplatok krátený podľa platených hodín'));
  if(values.otherPaid>0) checks.push(row('Ostatné pravidelné príplatky',fundHours?values.otherMonthly/fundHours*values.baseHours:0,values.otherPaid,0.15,'Súčet položiek Osobitný + Ostatné'));
  checks.push(row('Mzda za nadčas',regularHourly*values.overtimeHoursPayslip,values.overtimePaid,0.15,'Tarifa + pravidelné príplatky, prepočítané na hodinu'));
  checks.push(row('Náhrada za dovolenku',values.average*values.vacationHoursAttendance,values.vacationPaid,0.15,'Priemer pre náhrady × hodiny dovolenky'));
  const bad=checks.filter(x=>x.status==='bad');
  const totalDiff=bad.filter(x=>x.name.includes('mzda')||x.name.includes('príplatok')||x.name.includes('dovolenku')).reduce((a,b)=>a+b.diff,0);
  const verdict=$('verdict'); verdict.className='verdict '+(bad.length===0?'ok':bad.length<=2?'warn':'bad');
  verdict.innerHTML=`<h2>${bad.length===0?'Kontrolované položky sedia':'Našli sme '+bad.length+' nezrovnalosti'}</h2><p>${bad.length===0?'V rozsahu, ktorý v1 dokáže overiť, je výpočet správny.':`Súčet rozdielov pri peňažných položkách: <strong>${money(totalDiff)}</strong>. Najprv skontrolujte načítané vstupy.`}</p>`;
  $('results').innerHTML=checks.map(x=>`<div class="result-row"><strong>${x.name}<br><small>${x.note}</small></strong><span>Očakávané<br><b>${x.name.includes('hodín')?x.expected.toFixed(2)+' h':money(x.expected)}</b></span><span>Na páske<br><b>${x.name.includes('hodín')?x.actual.toFixed(2)+' h':money(x.actual)}</b></span><span class="status ${x.status}">${x.label}${x.status==='bad'?`<br>${x.name.includes('hodín')?x.diff.toFixed(2)+' h':money(x.diff)}`:''}</span></div>`).join('');
  $('resultCard').classList.remove('hidden'); $('resultCard').scrollIntoView({behavior:'smooth'});
};
