
const tabs=document.querySelectorAll('.tab');
const panels=document.querySelectorAll('.panel');

tabs.forEach(t=>{
  t.onclick=()=>{
    tabs.forEach(b=>b.classList.remove('active'));
    panels.forEach(p=>p.classList.remove('active'));
    t.classList.add('active');
    document.getElementById(t.dataset.tab).classList.add('active');
  }
});

fetch('data/scores.json').then(r=>r.json()).then(d=>{
  new Chart(document.getElementById('trend'),{
    type:'line',
    data:{
      labels:d.scores.labels,
      datasets:[
        {label:'전공',data:d.scores.major,borderWidth:4},
        {label:'기초',data:d.scores.basic,borderWidth:2},
        {label:'비주요',data:d.scores.minor,borderWidth:2},
        {label:'전체',data:d.scores.overall,borderDash:[5,5],borderWidth:2}
      ]
    },
    options:{responsive:true,scales:{y:{reverse:true,min:1,max:4}}}
  });
});
