const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

let DATA = null;
let trendChart = null;

function badge(category){
  if(category === "major") return `<span class="badge badge--major">전공</span>`;
  if(category === "basic") return `<span class="badge badge--basic">기초</span>`;
  return `<span class="badge badge--minor">비주요</span>`;
}

function semesterLabel(key){
  // key like "2-1"
  const [g,t] = key.split("-");
  return `${g}학년 ${t}학기`;
}

function escapeHtml(str){
  return (str ?? "").replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function setView(view){
  $$(".view").forEach(v => v.classList.add("hidden"));
  $(`#view-${view}`).classList.remove("hidden");
  $$(".nav__btn").forEach(b => b.removeAttribute("aria-current"));
  $(`.nav__btn[data-view="${view}"]`).setAttribute("aria-current","page");
}

function computeSemesterAverages(sem){
  const cats = { basic: [], major: [], minor: [] };
  sem.subjects.forEach(s => cats[s.category].push(s.grade));
  const avg = (arr) => arr.length ? (arr.reduce((a,b)=>a+b,0)/arr.length) : null;
  const all = sem.subjects.map(s=>s.grade);
  return {
    overall: avg(all),
    basic: avg(cats.basic),
    major: avg(cats.major),
    minor: avg(cats.minor),
  };
}

function renderOverview(){
  // Admission checks (static but data-informed)
  const checks = [
    "전공교과(수학·물리·정보)의 이수 흐름이 학년이 올라갈수록 강화되는지",
    "과세특에서 반복적으로 드러나는 역량(탐구·문제해결·모델링·데이터)이 있는지",
    "성적이 크게 흔들리는 구간이 있다면, 과세특·활동에서 보완 근거가 있는지",
    "비전공 교과에서도 협업·의사소통 등 기초역량이 꾸준히 확인되는지",
  ];
  $("#admissionChecks").innerHTML = checks.map(c=>`<li>${c}</li>`).join("");

  $("#fitSummary").innerHTML = `
    <p><strong>${escapeHtml(DATA.meta.student.intended_major)}</strong> 관점에서 보면,
    수학·물리의 기초 이론을 ‘문제 해결’로 연결하는 서술이 반복적으로 확인되며,
    3학년에서 프로그래밍/인공지능 영역으로 확장되는 흐름이 나타납니다.</p>
    <p class="muted">※ 본 텍스트는 교육용 가상 데이터 기반의 예시 해석입니다.</p>
  `;

  // semester tags: derive from frequent keywords in SE
  const tagsBySem = DATA.semesters.map(sem => {
    const text = sem.subjects.map(s=>s.se).join(" ");
    const candidates = [
      "탐구","문제해결","모델링","데이터","그래프","검증","오차","일반화","발표","협업","윤리","알고리즘","최적화","변인","가설"
    ];
    const found = candidates.filter(k => text.includes(k));
    const top = found.slice(0, 7);
    return { key: sem.key, tags: top.length ? top : ["성실","기초개념","정리"] };
  });

  const wrap = $("#semesterTags");
  wrap.innerHTML = "";
  tagsBySem.forEach(item => {
    const block = document.createElement("div");
    block.style.marginBottom = "12px";
    block.innerHTML = `
      <div class="result__top">
        <div class="result__title">${semesterLabel(item.key)}</div>
        <div class="result__meta">${item.tags.length}개 키워드</div>
      </div>
      <div class="tags" style="margin-top:10px;">
        ${item.tags.map((t,i)=>`<span class="tag ${i<2?'tag--accent':''}">${escapeHtml(t)}</span>`).join("")}
      </div>
    `;
    wrap.appendChild(block);
  });
}

function renderSemesterSelect(){
  const sel = $("#semesterSelect");
  sel.innerHTML = DATA.semesters.map(sem => `<option value="${sem.key}">${semesterLabel(sem.key)}</option>`).join("");
  sel.value = DATA.semesters[DATA.semesters.length-1].key; // default latest
}

function renderSubjectTable(semKey){
  const sem = DATA.semesters.find(s=>s.key===semKey);
  const table = $("#subjectTable");
  table.innerHTML = `
    <thead>
      <tr>
        <th>과목</th>
        <th>구분</th>
        <th>단위</th>
        <th>등급</th>
        <th>성취도</th>
      </tr>
    </thead>
    <tbody>
      ${sem.subjects.map((s,idx)=>`
        <tr data-idx="${idx}">
          <td class="clickable">${escapeHtml(s.name)}</td>
          <td>${badge(s.category)}</td>
          <td>${s.credits}</td>
          <td><strong>${s.grade}</strong></td>
          <td>${escapeHtml(s.achievement)}</td>
        </tr>
      `).join("")}
    </tbody>
  `;

  // click rows to show SE
  table.querySelectorAll("tbody tr").forEach(tr=>{
    tr.addEventListener("click", ()=>{
      const idx = Number(tr.getAttribute("data-idx"));
      const s = sem.subjects[idx];
      $("#seDetail").innerHTML = `
        <p><span class="badge ${s.category==='major'?'badge--major':s.category==='basic'?'badge--basic':'badge--minor'}">${s.category==='major'?'전공':'기초'}</span></p>
        <h3 style="margin:8px 0 10px; font-size:18px; letter-spacing:-0.2px;">${escapeHtml(s.name)}</h3>
        <p class="muted" style="margin-top:-6px;">${semesterLabel(sem.key)} · 단위 ${s.credits} · 등급 ${s.grade} · 성취도 ${escapeHtml(s.achievement)}</p>
        <hr style="border:0; border-top:1px solid rgba(255,255,255,0.10); margin:14px 0;">
        <p>${escapeHtml(s.se)}</p>
      `;
    });
  });

  // default show first major subject if exists
  const firstMajor = sem.subjects.findIndex(x=>x.category==="major");
  if(firstMajor >= 0){
    table.querySelector(`tbody tr[data-idx="${firstMajor}"]`)?.click();
  }else{
    table.querySelector(`tbody tr[data-idx="0"]`)?.click();
  }
}

function renderTrend(){
  const labels = DATA.semesters.map(s=>semesterLabel(s.key));
  const overall = [];
  const basic = [];
  const major = [];
  const minor = [];

  DATA.semesters.forEach(sem=>{
    const a = computeSemesterAverages(sem);
    overall.push(a.overall);
    basic.push(a.basic);
    major.push(a.major);
    minor.push(a.minor);
  });

  // Chart
  const ctx = $("#trendChart");
  if(trendChart) trendChart.destroy();
  trendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label:"전체", data: overall, tension:0.25, borderWidth:2, pointRadius:3 },
        { label:"기초교과", data: basic, tension:0.25, borderWidth:2, pointRadius:3 },
        { label:"전공교과", data: major, tension:0.25, borderWidth:2, pointRadius:3 },
        { label:"비주요", data: minor, tension:0.25, borderWidth:2, pointRadius:3 },
      ]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{
        legend:{ labels:{ color:"rgba(255,255,255,0.78)", font:{ weight:"700" } } },
        tooltip:{ callbacks:{
          label:(ctx)=>`${ctx.dataset.label}: ${Number(ctx.raw).toFixed(2)}`
        }}
      },
      scales:{
        x:{ ticks:{ color:"rgba(255,255,255,0.62)" }, grid:{ color:"rgba(255,255,255,0.06)" } },
        y:{ reverse:true, suggestedMin:1, suggestedMax:5, ticks:{ color:"rgba(255,255,255,0.62)" }, grid:{ color:"rgba(255,255,255,0.06)" } }
      }
    }
  });

  // Table
  const rows = DATA.semesters.map(sem=>{
    const a = computeSemesterAverages(sem);
    const f = (v)=> (v==null? "-" : v.toFixed(2));
    return `
      <tr>
        <td><strong>${semesterLabel(sem.key)}</strong></td>
        <td>${f(a.overall)}</td>
        <td>${f(a.basic)}</td>
        <td>${f(a.major)}</td>
        <td>${f(a.minor)}</td>
      </tr>
    `;
  }).join("");

  $("#trendTable").innerHTML = `
    <thead>
      <tr><th>학기</th><th>전체</th><th>기초</th><th>전공</th><th>비주요</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  `;
}

function highlight(text, query){
  const safe = escapeHtml(text);
  const q = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(q, "gi");
  return safe.replace(re, (m)=>`<mark>${m}</mark>`);
}

function runSearch(){
  const q = $("#searchInput").value.trim();
  const box = $("#searchResults");
  if(!q){
    box.innerHTML = `<div class="emptyState">검색어를 입력하세요.</div>`;
    return;
  }
  const results = [];
  DATA.semesters.forEach(sem=>{
    sem.subjects.forEach(s=>{
      if((s.se || "").includes(q)){
        // excerpt: show around keyword
        const idx = s.se.indexOf(q);
        const start = Math.max(0, idx-28);
        const end = Math.min(s.se.length, idx+q.length+28);
        const excerpt = s.se.slice(start, end);
        results.push({
          semKey: sem.key,
          subject: s.name,
          category: s.category,
          excerpt
        });
      }
    });
  });

  if(!results.length){
    box.innerHTML = `<div class="emptyState">“${escapeHtml(q)}”에 대한 결과가 없습니다.</div>`;
    return;
  }

  box.innerHTML = results.map((r)=>`
    <div class="result">
      <div class="result__top">
        <div class="result__title">${escapeHtml(r.subject)} ${badge(r.category)}</div>
        <div class="result__meta">${semesterLabel(r.semKey)}</div>
      </div>
      <div class="result__excerpt">${highlight(r.excerpt, q)}</div>
      <div style="margin-top:10px;">
        <button class="btn btn--ghost" data-jump="${r.semKey}|${escapeHtml(r.subject)}">교과·과세특에서 보기</button>
      </div>
    </div>
  `).join("");

  // jump handlers
  box.querySelectorAll("button[data-jump]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const [semKey, subject] = btn.getAttribute("data-jump").split("|");
      setView("records");
      $("#semesterSelect").value = semKey;
      renderSubjectTable(semKey);
      // focus subject row
      const sem = DATA.semesters.find(s=>s.key===semKey);
      const idx = sem.subjects.findIndex(s=>s.name===subject);
      const row = $("#subjectTable").querySelector(`tbody tr[data-idx="${idx}"]`);
      row?.scrollIntoView({behavior:"smooth", block:"center"});
      row?.click();
    });
  });
}

async function init(){
  const res = await fetch("data/applicantA.json");
  DATA = await res.json();

  // left meta
  $("#studentMajor").textContent = `희망 전공: ${DATA.meta.student.intended_major}`;
  $("#studentProfile").textContent = DATA.meta.student.profile;

  // KPIs (use dataset summary; display as-is)
  $("#kpiOverall").textContent = (DATA.summary?.overall ?? "-");
  $("#kpiBasic").textContent = (DATA.summary?.basic ?? "-");
  $("#kpiMajor").textContent = (DATA.summary?.major ?? "-");
  $("#kpiMinor").textContent = (DATA.summary?.minor ?? "-");

  renderOverview();
  renderSemesterSelect();
  renderSubjectTable($("#semesterSelect").value);
  renderTrend();

  // events
  $$(".nav__btn").forEach(btn=>{
    btn.addEventListener("click", ()=> setView(btn.dataset.view));
  });

  $("#semesterSelect").addEventListener("change", (e)=>{
    renderSubjectTable(e.target.value);
  });

  $("#searchBtn").addEventListener("click", runSearch);
  $("#clearBtn").addEventListener("click", ()=>{
    $("#searchInput").value = "";
    $("#searchResults").innerHTML = `<div class="emptyState">검색어를 입력하고 검색하세요.</div>`;
  });
  $("#searchInput").addEventListener("keydown", (e)=>{
    if(e.key === "Enter") runSearch();
  });

  // default results state
  $("#searchResults").innerHTML = `<div class="emptyState">검색어를 입력하고 검색하세요.</div>`;
}

init();
