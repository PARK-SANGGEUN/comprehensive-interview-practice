
fetch('data/experience.json').then(r=>r.json()).then(d=>{
  const title=document.getElementById('modeTitle');
  const intro=document.getElementById('modeIntro');
  const content=document.getElementById('modeContent');

  function render(mode){
    if(mode==='student'){
      title.textContent='학생 체험모드';
      intro.textContent=d.experience.student.intro;
      content.innerHTML='<h3>체크리스트</h3><ul>'+
        d.experience.student.checklist.map(x=>'<li>'+x+'</li>').join('')+
        '</ul><h3>되돌아보기</h3><ul>'+
        d.experience.student.reflection.map(x=>'<li>'+x+'</li>').join('')+'</ul>';
    }
    if(mode==='parent'){
      title.textContent='학부모 체험모드';
      intro.textContent=d.experience.parent.intro;
      content.innerHTML='<h3>이해 포인트</h3><ul>'+
        d.experience.parent.guide.map(x=>'<li>'+x+'</li>').join('')+'</ul>';
    }
    if(mode==='assessor'){
      title.textContent='입학사정관 모드';
      intro.textContent='실제 평가 화면(요약)을 제공합니다.';
      content.innerHTML='<p>※ 상세 평가는 교과·과세특 화면에서 확인합니다.</p>';
    }
  }

  document.querySelectorAll('.modebar button').forEach(btn=>{
    btn.onclick=()=>render(btn.dataset.mode);
  });

  render('student');
});
