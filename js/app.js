
fetch('data/students.json').then(r=>r.json()).then(d=>{
 const s=d.students[0];
 document.getElementById('timeline').innerHTML =
  s.specs.map(x=>`<div><strong>${x.subject}</strong> <span class='tcell lv${x.lv}'>${x.y} Lv${x.lv}</span></div>`).join('');
 new Chart(document.getElementById('trend'),{
  type:'line',
  data:{labels:s.semesters.map(x=>x.y),datasets:[{label:'평균등급',data:s.semesters.map(x=>x.g)}]},
  options:{scales:{y:{reverse:true}}}
 });
});
