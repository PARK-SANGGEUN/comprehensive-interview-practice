
const $ = (s)=>document.querySelector(s);
const $$ = (s)=>Array.from(document.querySelectorAll(s));
let DB=null;
let MODE='student';
let COMPARE=false;
let CUR='A';
let ACT_TAB='autonomous';
let charts = {};

const CHECKLISTS = {
  student: [
    {id:'s1', text:'전공 관련 과목을 회피하지 않고 선택했다', evidence:(app)=>({type:'courses'})},
    {id:'s2', text:'전공 성적이 유지·상승 추세다', evidence:(app)=>({type:'trend', focus:'major'})},
    {id:'s3', text:'과세특에 탐구·문제해결·검증이 반복된다', evidence:(app)=>({type:'keyword', q:['탐구','검증','모델링','문제 해결']})},
    {id:'s4', text:'학년이 올라갈수록 세특의 깊이가 깊어졌다', evidence:(app)=>({type:'growth'})},
    {id:'s5', text:'비전공 과목에서도 성실한 태도가 보인다', evidence:(app)=>({type:'basic_minor'})},
  ],
  parent: [
    {id:'p1', text:'전체 평균보다 전공 평균이 더 중요하다는 점을 이해했다', evidence:(app)=>({type:'summary'})},
    {id:'p2', text:'비주요 3등급대는 치명적이지 않음을 이해했다', evidence:(app)=>({type:'summary'})},
    {id:'p3', text:'한 번의 등락보다 “패턴(유지·상승)”을 본다', evidence:(app)=>({type:'trend', focus:'overall'})},
    {id:'p4', text:'활동은 나열이 아니라 연결(지속성·맥락)이다', evidence:(app)=>({type:'activities'})},
  ],
  assessor: [
    {id:'a1', text:'전공 교과 이수·성취·근거(세특)가 일관적이다', evidence:(app)=>({type:'major_proof'})},
    {id:'a2', text:'수강자 수가 큰 과목에서의 성취 근거를 확인했다', evidence:(app)=>({type:'enrollment'})},
    {id:'a3', text:'출결 안정성과 지속성을 확인했다', evidence:(app)=>({type:'attendance'})},
  ]
};

function badge(cat){
  if(cat==='major') return '<span class="badge major">전공</span>';
  if(cat==='basic') return '<span class="badge basic">기초</span>';
  return '<span class="badge minor">비주요</span>';
}
function semLabel(k){
  const [g,t]=k.split('-');
  return `${g}학년 ${t}학기`;
}
function tone(v){
  const s = String(v);
  if (s.includes('매우')) return 'good';
  if (s.includes('미흡')) return 'bad';
  if (s.includes('보통')) return 'warn';
  return 'good';
}
function setMode(m){
  MODE=m;
  $$('.seg__btn[data-mode]').forEach(b=>b.classList.toggle('active', b.dataset.mode===m));
  renderChecklist();
  $('#evidence').innerHTML = `<div class="empty">체크리스트 항목을 선택하거나, 키워드 검색을 실행해 보세요.</div>`;
}
function setCompare(on){
  COMPARE = on;
  $$('.seg__btn[data-compare]').forEach(b=>b.classList.toggle('active', (b.dataset.compare==='on')===on));
  $('#compareCard').style.display = on ? 'block' : 'none';
  if(on) renderCompareCharts();
}
function getApp(id){ return DB.applicants.find(x=>x.id===id); }

function renderAppSelect(){
  const sel = $('#appSel');
  sel.innerHTML = DB.applicants.map(a=>`<option value="${a.id}">${a.name}</option>`).join('');
  sel.value = CUR;
}
function renderHeaderPills(app){
  $('#resultPill').textContent = app.summary_card.doc_result;
  $('#avgPill').textContent = `요약 평균: 전체 ${app.summary_card.overall} / 전공 ${app.summary_card.major}`;
  $('#disclaimer').textContent = DB.meta.disclaimer;
}
function renderSummary(app){
  const s=app.summary_card;
  const items=[
    ['전체', s.overall],
    ['기초교과', s.basic],
    ['전공교과', s.major],
    ['비주요', s.minor],
    ['서류평가', s.doc_result]
  ];
  $('#summaryGrid').innerHTML = items.map(([k,v])=>`
    <div class="kpi">
      <div class="kpi__k">${k}</div>
      <div class="kpi__v">${v}</div>
    </div>`).join('');
}

function semScores(app){
  const labels=[], overall=[], major=[], basic=[], minor=[];
  app.semesters.forEach(sem=>{
    labels.push(semLabel(sem.key));
    const subs=sem.subjects;
    const wavg=(items)=>{
      const w=items.reduce((a,x)=>a+x.credit,0);
      if(!w) return null;
      return items.reduce((a,x)=>a+x.grade*x.credit,0)/w;
    };
    overall.push(wavg(subs));
    major.push(wavg(subs.filter(x=>x.category==='major')));
    basic.push(wavg(subs.filter(x=>x.category==='basic')));
    minor.push(wavg(subs.filter(x=>x.category==='minor')));
  });
  return {labels, overall, major, basic, minor};
}

function renderTrendCharts(app){
  const d=semScores(app);
  if(charts.trend1) charts.trend1.destroy();
  charts.trend1 = new Chart($('#trend1'),{
    type:'line',
    data:{labels:d.labels,
      datasets:[
        {label:'전공(학기 평균)', data:d.major, borderWidth:4},
        {label:'전체(학기 평균)', data:d.overall, borderDash:[6,6], borderWidth:2}
      ]},
    options:{responsive:true, plugins:{legend:{display:true}},
      scales:{y:{reverse:true, suggestedMin:1, suggestedMax:4}}}
  });
  if(charts.trend2) charts.trend2.destroy();
  charts.trend2 = new Chart($('#trend2'),{
    type:'line',
    data:{labels:d.labels,
      datasets:[
        {label:'기초(학기 평균)', data:d.basic, borderWidth:2},
        {label:'비주요(학기 평균)', data:d.minor, borderWidth:2}
      ]},
    options:{responsive:true, plugins:{legend:{display:true}},
      scales:{y:{reverse:true, suggestedMin:1, suggestedMax:4}}}
  });
}

function renderSemSel(app){
  const sel=$('#semSel');
  sel.innerHTML = app.semesters.map(s=>`<option value="${s.key}">${semLabel(s.key)}</option>`).join('');
  sel.value = app.semesters[app.semesters.length-1].key;
}

function renderSubjectTable(app){
  const semKey = $('#semSel').value;
  const cat = $('#catSel').value;
  const sem = app.semesters.find(s=>s.key===semKey);
  let subs = sem.subjects.slice();
  if(cat!=='all') subs=subs.filter(x=>x.category===cat);

  $('#subTable').innerHTML = `
    <thead><tr>
      <th>과목</th><th>구분</th><th>단위</th><th>등급</th><th>수강자</th>
    </tr></thead>
    <tbody>
      ${subs.map((x)=>`
        <tr data-name="${x.name}">
          <td class="click">${x.name}</td>
          <td>${badge(x.category)}</td>
          <td>${x.credit}</td>
          <td><b>${x.grade.toFixed(1)}</b></td>
          <td>${x.enrollment}</td>
        </tr>`).join('')}
    </tbody>`;

  $('#subTable').querySelectorAll('tbody tr').forEach(tr=>{
    tr.addEventListener('click', ()=>{
      const name = tr.dataset.name;
      const s = sem.subjects.find(z=>z.name===name);
      $('#detail').innerHTML = `
        <h3>${s.name}</h3>
        <div class="muted small">${semLabel(sem.key)} · ${badge(s.category)} · 단위 ${s.credit} · 등급 ${s.grade.toFixed(1)} · 수강자 ${s.enrollment}명</div>
        <div class="hr"></div>
        <div>${s.se}</div>
      `;
    });
  });
  $('#subTable').querySelector('tbody tr')?.click();
}

function renderActivities(app){
  const body = $('#actBody');
  const sems = app.semesters.map(s=>s.key);
  const by = app.activities_by_sem;
  let html='';
  if(ACT_TAB==='volunteer'){
    const v=by.volunteer;
    html += `<div class="block"><div class="block__h">총 봉사시간</div><b>${v.total_hours}시간</b></div>`;
    html += `<div class="block"><div class="block__h">세부</div><ul>${v.items.map(it=>`<li><b>${it.period}</b> · ${it.desc}</li>`).join('')}</ul></div>`;
    body.innerHTML = html;
    return;
  }
  const tabMap = {autonomous:'자율활동', club:'동아리활동', career:'진로활동'};
  sems.forEach(k=>{
    const items = by[ACT_TAB][k] || [];
    html += `<div class="block">
      <div class="block__h">${tabMap[ACT_TAB]} · ${semLabel(k)}</div>
      ${items.length ? `<ul>${items.map(t=>`<li>${t}</li>`).join('')}</ul>` : `<div class="muted small">기록 없음</div>`}
    </div>`;
  });
  body.innerHTML = html;
}

function renderAttendance(app){
  const sems = app.semesters.map(s=>s.key);
  let html='';
  sems.forEach(k=>{
    const items = app.attendance_by_sem[k] || [];
    html += `<div class="block">
      <div class="block__h">${semLabel(k)}</div>
      ${items.length ? `<ul>${items.map(it=>`<li><b>${it.type}</b> ${it.count}회 · <span class="muted">${it.note||''}</span></li>`).join('')}</ul>` : `<div class="muted small">결석/지각/조퇴 기록 없음</div>`}
    </div>`;
  });
  $('#attBody').innerHTML = html;
}

function renderBehavior(app){
  const years = ['1','2','3'];
  let html='';
  years.forEach(y=>{
    const items = app.behavior_by_year[y] || [];
    html += `<div class="block">
      <div class="block__h">${y}학년</div>
      ${items.length ? `<ul>${items.map(t=>`<li>${t}</li>`).join('')}</ul>` : `<div class="muted small">기록 없음</div>`}
    </div>`;
  });
  $('#behBody').innerHTML = html;
}

function renderEvaluators(app){
  const wrap=$('#evalList');
  wrap.innerHTML = app.evaluators.map(e=>`
    <div class="eval">
      <div class="eval__top">
        <div class="eval__name">평가자 ${e.name}</div>
      </div>
      <div class="grid5">
        <div class="chip ${tone(e.academic_base)}">기초 ${e.academic_base}</div>
        <div class="chip ${tone(e.academic)}">학업 ${e.academic}</div>
        <div class="chip ${tone(e.career_fit)}">진로 ${e.career_fit}</div>
        <div class="chip ${tone(e.initiative)}">주도 ${e.initiative}</div>
        <div class="chip ${tone(e.collab)}">협업 ${e.collab}</div>
      </div>
      <div class="muted small mt8">${e.comment}</div>
    </div>
  `).join('');
  $('#rubricNote').textContent = DB.rubric.source_note;
}

function renderChecklist(){
  const list = CHECKLISTS[MODE];
  $('#checklist').innerHTML = `<ul style="margin:0;padding-left:18px">
    ${list.map(x=>`<li style="margin:10px 0"><a href="#" class="cl" data-id="${x.id}">${x.text}</a></li>`).join('')}
  </ul>`;
  $$('.cl').forEach(a=>a.addEventListener('click', (ev)=>{
    ev.preventDefault();
    const id=a.dataset.id;
    const item=list.find(x=>x.id===id);
    renderEvidence(item);
  }));
}

function highlight(text, query){
  if(!query) return text;
  const q = Array.isArray(query) ? query : [query];
  let out=text;
  q.forEach(w=>{
    const r = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'g');
    out = out.replace(r, (m)=>`<mark>${m}</mark>`);
  });
  return out;
}

function renderEvidence(item){
  const app=getApp(CUR);
  const ev = item.evidence(app);
  let html='';

  if(ev.type==='summary'){
    html += `<div class="ev"><b>요약 지표</b><div class="muted small mt8">전체 ${app.summary_card.overall} / 기초 ${app.summary_card.basic} / 전공 ${app.summary_card.major} / 비주요 ${app.summary_card.minor}</div></div>`;
  }
  if(ev.type==='courses'){
    const cs=app.course_selection;
    html += `<div class="ev"><b>선택과목 이수현황</b>
      <ul>
        <li><b>2학년 일반</b>: ${cs["2nd_general"].join(', ')}</li>
        <li><b>2학년 진로/전문</b>: ${cs["2nd_career"].join(', ')}</li>
        <li><b>3학년 일반</b>: ${cs["3rd_general"].length?cs["3rd_general"].join(', '):'없음'}</li>
        <li><b>3학년 진로/전문</b>: ${cs["3rd_career"].join(', ')}</li>
      </ul></div>`;
  }
  if(ev.type==='trend'){
    html += `<div class="ev"><b>성적 추이 확인</b><div class="muted small mt8">그래프에서 '${ev.focus}' 흐름(유지·상승/하락)을 확인하세요.</div></div>`;
  }
  if(ev.type==='activities'){
    html += `<div class="ev"><b>활동의 연결(지속성·맥락)</b><div class="muted small mt8">자율·동아리·진로 탭에서 학기별 흐름을 확인하세요.</div></div>`;
  }
  if(ev.type==='attendance'){
    html += `<div class="ev"><b>출결 안정성</b><div class="muted small mt8">출결사항 카드에서 학기별 결석/지각/조퇴 기록을 확인하세요.</div></div>`;
  }
  if(ev.type==='enrollment'){
    const rows=[];
    app.semesters.forEach(sem=>{
      sem.subjects.forEach(s=>{ if(s.enrollment>=150) rows.push({sem:sem.key, ...s}); });
    });
    rows.sort((a,b)=>b.enrollment-a.enrollment);
    html += `<div class="ev"><b>수강자 수가 큰 과목 근거</b><ul>${rows.slice(0,8).map(r=>`<li>${semLabel(r.sem)} · ${r.name} (수강자 ${r.enrollment}명, 등급 ${r.grade.toFixed(1)})</li>`).join('')}</ul></div>`;
  }
  if(ev.type==='keyword'){
    const hits=[];
    app.semesters.forEach(sem=>{
      sem.subjects.forEach(s=>{
        if(ev.q.some(k=>s.se.includes(k))) hits.push({sem:sem.key, name:s.name, se:s.se});
      })
    });
    html += `<div class="ev"><b>키워드 근거</b>
      ${hits.length? `<ul>${hits.slice(0,10).map(h=>`<li>${semLabel(h.sem)} · <b>${h.name}</b><div class="muted small mt8">${highlight(h.se, ev.q)}</div></li>`).join('')}</ul>`
      : `<div class="muted small">해당 키워드가 포함된 세특을 찾지 못했습니다.</div>`}
    </div>`;
  }
  if(ev.type==='growth'){
    const first = app.semesters.find(s=>s.key==='1-1')?.subjects.find(x=>x.category==='major');
    const last = app.semesters.find(s=>s.key==='3-1')?.subjects.find(x=>x.category==='major');
    html += `<div class="ev"><b>세특 깊이(성장) 비교</b>
      <div class="muted small mt8"><b>1학년</b>: ${first?first.name:'-'}<br>${first?first.se:'-'}</div>
      <div class="muted small mt8"><b>3학년</b>: ${last?last.name:'-'}<br>${last?last.se:'-'}</div>
    </div>`;
  }
  if(ev.type==='basic_minor'){
    const b = app.semesters[0].subjects.find(x=>x.category==='basic');
    const m = app.semesters[0].subjects.find(x=>x.category==='minor');
    html += `<div class="ev"><b>비전공 과목의 태도 근거</b>
      <div class="muted small mt8"><b>${b.name}</b>: ${b.se}</div>
      <div class="muted small mt8"><b>${m.name}</b>: ${m.se}</div>
    </div>`;
  }
  if(ev.type==='major_proof'){
    const hits=[];
    app.semesters.forEach(sem=>sem.subjects.filter(s=>s.category==='major').forEach(s=>hits.push({sem:sem.key, ...s})));
    html += `<div class="ev"><b>전공 교과 근거(이수·성취·세특)</b>
      <ul>${hits.slice(0,10).map(h=>`<li>${semLabel(h.sem)} · ${h.name} (단위 ${h.credit}, 등급 ${h.grade.toFixed(1)})</li>`).join('')}</ul>
      <div class="muted small mt8">전공 과목 세특에서 탐구/검증 흐름이 반복되는지 확인하세요.</div>
    </div>`;
  }

  $('#evidence').innerHTML = html || `<div class="empty">근거를 표시할 수 없습니다.</div>`;
}

function doSearch(){
  const q=$('#q').value.trim();
  if(!q){ return; }
  const app=getApp(CUR);
  const hits=[];

  app.semesters.forEach(sem=>{
    sem.subjects.forEach(s=>{
      const blob = `${s.name} ${s.se}`;
      if(blob.includes(q)) hits.push({type:'과세특', where:`${semLabel(sem.key)} · ${s.name}`, text:s.se});
    })
  });

  ['autonomous','club','career'].forEach(t=>{
    const title = t==='autonomous'?'자율':t==='club'?'동아리':'진로';
    Object.entries(app.activities_by_sem[t]).forEach(([sem, arr])=>{
      (arr||[]).forEach(line=>{ if(line.includes(q)) hits.push({type:`${title}활동`, where:semLabel(sem), text:line}); })
    })
  });

  Object.entries(app.behavior_by_year).forEach(([y, arr])=>{
    (arr||[]).forEach(line=>{ if(line.includes(q)) hits.push({type:'행특', where:`${y}학년`, text:line}); })
  });

  app.evaluators.forEach(e=>{ if(e.comment.includes(q)) hits.push({type:'평가자', where:`평가자 ${e.name}`, text:e.comment}); });

  const html = hits.length
    ? hits.slice(0,30).map(h=>`
        <div class="ev">
          <b>${h.type}</b> · <span class="muted small">${h.where}</span>
          <div class="muted small mt8">${highlight(h.text, q)}</div>
        </div>`).join('')
    : `<div class="empty">검색 결과가 없습니다.</div>`;

  $('#evidence').innerHTML = `<div class="ev"><b>검색 결과</b><div class="muted small mt8">키워드: <b>${q}</b> · ${hits.length}건</div></div>` + html;
}

function clearSearch(){
  $('#q').value='';
  $('#evidence').innerHTML = `<div class="empty">체크리스트 항목을 선택하거나, 키워드 검색을 실행해 보세요.</div>`;
}

function renderCompareCharts(){
  const A=getApp('A'), C=getApp('C');
  const a=semScores(A), c=semScores(C);
  if(charts.cmpTrend) charts.cmpTrend.destroy();
  charts.cmpTrend = new Chart($('#cmpTrend'),{
    type:'line',
    data:{labels:a.labels,
      datasets:[
        {label:'A 전공', data:a.major, borderWidth:4},
        {label:'C 전공', data:c.major, borderWidth:4},
        {label:'A 전체', data:a.overall, borderDash:[6,6], borderWidth:2},
        {label:'C 전체', data:c.overall, borderDash:[6,6], borderWidth:2},
      ]},
    options:{responsive:true, scales:{y:{reverse:true, suggestedMin:1, suggestedMax:4}}}
  });

  const conv=(g)=>Math.max(0, Math.min(100, 110 - g*25));
  const scoreMap=(app)=>[conv(app.summary_card.basic), conv(app.summary_card.overall), conv(app.summary_card.major), conv(app.summary_card.major), 85, 85];

  if(charts.cmpRadar) charts.cmpRadar.destroy();
  charts.cmpRadar = new Chart($('#cmpRadar'),{
    type:'radar',
    data:{labels:['기초학업','학업','전공수학','진로역량','주도성','협업'],
      datasets:[{label:'A', data:scoreMap(A), borderWidth:2},{label:'C', data:scoreMap(C), borderWidth:2}]},
    options:{responsive:true, scales:{r:{min:0, max:100}}}
  });
}

async function init(){
  DB = await (await fetch('data/app.json')).json();
  renderAppSelect();
  const app = getApp(CUR);
  renderHeaderPills(app);
  renderSummary(app);
  renderTrendCharts(app);
  renderSemSel(app);
  renderSubjectTable(app);
  renderActivities(app);
  renderAttendance(app);
  renderBehavior(app);
  renderEvaluators(app);
  renderChecklist();

  $$('.seg__btn[data-mode]').forEach(b=>b.addEventListener('click', ()=>setMode(b.dataset.mode)));
  $$('.seg__btn[data-compare]').forEach(b=>b.addEventListener('click', ()=>setCompare(b.dataset.compare==='on')));

  $('#appSel').addEventListener('change', (e)=>{
    CUR=e.target.value;
    const a=getApp(CUR);
    renderHeaderPills(a);
    renderSummary(a);
    renderTrendCharts(a);
    renderSemSel(a);
    renderSubjectTable(a);
    renderActivities(a);
    renderAttendance(a);
    renderBehavior(a);
    renderEvaluators(a);
    clearSearch();
  });

  $('#semSel').addEventListener('change', ()=>renderSubjectTable(getApp(CUR)));
  $('#catSel').addEventListener('change', ()=>renderSubjectTable(getApp(CUR)));

  $$('.tab2').forEach(t=>t.addEventListener('click', ()=>{
    $$('.tab2').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    ACT_TAB=t.dataset.tab;
    renderActivities(getApp(CUR));
  }));

  $('#btnSearch').addEventListener('click', doSearch);
  $('#btnClear').addEventListener('click', clearSearch);
  $('#q').addEventListener('keydown', (e)=>{ if(e.key==='Enter') doSearch(); });
}
init();
