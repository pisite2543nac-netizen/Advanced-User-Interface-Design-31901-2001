const C=window.CFG,U=window.UNITS,$=s=>document.querySelector(s),app=$('#app');
const sb=supabase.createClient(C.SUPABASE_URL,C.SUPABASE_KEY);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmt=d=>new Date(d).toLocaleString('th-TH');
let me=null,role=null,subs=[],fsTimer=null,guarded=false;
const susp=()=>me.suspended_until&&new Date(me.suspended_until)>new Date();
const blocked=k=>susp()&&(me.suspend_scope==='all'||k==='work');
const got=(u,k)=>subs.find(s=>s.unit===u&&s.kind===k);
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const bar=()=>`<div class="card bar"><b>${esc(C.COURSE_NAME)}</b><span>${esc(me?me.name:'ผู้ดูแลระบบ')} <button class="alt" id="lo">ออกจากระบบ</button></span></div>`;
const bindLo=()=>{const b=$('#lo');if(b)b.onclick=()=>{role=null;if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});location.reload()}};

function loginView(){app.innerHTML=`<div class="card login"><h2>${esc(C.COURSE_NAME)}</h2><p>${esc(C.COURSE_CODE)}</p><input id="u" placeholder="ชื่อผู้ใช้ / รหัสนักศึกษา" autocomplete="off"><input id="p" type="password" placeholder="รหัสผ่าน"><button id="go">เข้าสู่ระบบ</button><p id="msg" class="err"></p></div>`;
 $('#go').onclick=login;$('#p').onkeydown=e=>{if(e.key==='Enter')login()}}
async function login(){const u=$('#u').value.trim(),p=$('#p').value;
 if(u===C.ADMIN_USER&&p===C.ADMIN_PASS){role='admin';return adminView()}
 document.documentElement.requestFullscreen?.().catch(()=>{});
 const{data,error}=await sb.from('web_students').select('*').eq('id',u).eq('password',p).maybeSingle();
 if(error||!data){if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});$('#msg').textContent='ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';return}
 me=data;role='student';guard();await loadSubs();home()}
async function loadSubs(){const{data}=await sb.from('web_submissions').select('*').eq('student_id',me.id);subs=data||[]}
async function refreshMe(){const{data}=await sb.from('web_students').select('*').eq('id',me.id).single();if(data)me=data}

function guard(){if(guarded)return;guarded=true;
 ['copy','cut','paste','contextmenu','dragstart'].forEach(t=>document.addEventListener(t,e=>{if(role==='student')e.preventDefault()}));
 document.addEventListener('keydown',e=>{if(role!=='student')return;const k=e.key.toLowerCase(),m=e.ctrlKey||e.metaKey;
  if(e.key==='F12'||(m&&['c','v','x','a','u','s','p'].includes(k))||(m&&e.shiftKey&&['i','j','c'].includes(k))||(e.shiftKey&&e.key==='Insert')||(m&&e.key==='Insert'))e.preventDefault()});
 document.addEventListener('fullscreenchange',onFs)}
function onFs(){if(role!=='student')return;
 if(document.fullscreenElement){clearTimeout(fsTimer);$('#fsb')?.remove();return}
 const d=document.createElement('div');d.id='fsb';d.innerHTML=`<h2>กรุณากลับเข้าสู่โหมดเต็มหน้าจอ</h2><p>หากออกนานเกิน ${C.FS_GRACE} วินาที จะถูกบันทึกเป็นการออกจากเต็มจอ</p><button id="fsgo">กลับเข้าเต็มจอ</button>`;
 document.body.appendChild(d);$('#fsgo').onclick=()=>document.documentElement.requestFullscreen().catch(()=>{});
 fsTimer=setTimeout(async()=>{
  const{data}=await sb.from('web_students').select('fs_exits').eq('id',me.id).single();
  const n=(data?.fs_exits||0)+1,upd={fs_exits:n};
  if(n>=3){upd.suspended_until=new Date(Date.now()+C.SUSPEND_HOURS*36e5).toISOString();upd.suspend_scope='all'}
  await sb.from('web_students').update(upd).eq('id',me.id);Object.assign(me,upd);
  alert(n===1?`แจ้งเตือน: ออกจากโหมดเต็มหน้าจอเกิน ${C.FS_GRACE} วินาที (ครั้งที่ 1)`:n===2?`เตือนครั้งที่ 2: หากออกจากเต็มจออีกครั้ง จะถูกระงับการทำใบงาน ${C.SUSPEND_HOURS} ชั่วโมง`:`ครั้งที่ ${n}: ระงับการทำใบงานและข้อสอบ ${C.SUSPEND_HOURS} ชั่วโมง`);
  if(n>=3)home()},C.FS_GRACE*1000)}

function st(n){const r=got(n,'read'),w=got(n,'work'),e=got(n,'exam');
 return `อ่าน ${r?'✔':'–'} | ใบงาน ${w?'✔'+(w.is_late?' (ส่งช้า)':''):'–'} | สอบ ${e?e.score+'/20':'–'}`}
function home(){app.innerHTML=`${bar()}<div class="card"><h3>กติกาการใช้งาน</h3><ul>
<li>ลำดับแต่ละหน่วย: ใบความรู้ → ใบงาน → ข้อสอบ อ่านใบความรู้จบจึงปลดล็อกใบงาน ส่งใบงานแล้วจึงปลดล็อกข้อสอบ</li>
<li>ย้อนกลับไปอ่านใบความรู้ได้ทุกเมื่อ ยกเว้นระหว่างทำข้อสอบ</li>
<li>ระบบทำงานแบบเต็มหน้าจอ ห้ามคัดลอก วาง ตัด คลิกขวา และปุ่มลัดที่เกี่ยวข้อง</li>
<li>ออกจากเต็มจอเกิน ${C.FS_GRACE} วินาที: ครั้งที่ 1 แจ้งเตือน ครั้งที่ 2 เตือนว่าจะถูกระงับการทำใบงาน ${C.SUSPEND_HOURS} ชั่วโมง ครั้งที่ 3 ระงับการทำใบงานและข้อสอบ ${C.SUSPEND_HOURS} ชั่วโมง</li>
<li>เวลาส่งใบงานนับจากผู้ส่งคนแรกของหน่วยนั้น หากส่งช้ากว่าคนแรกเกิน ${C.LATE_HOURS} ชั่วโมง จะติดป้าย "ส่งช้า"</li>
<li>ข้อสอบ 20 ข้อ (พื้นฐาน 10 ยาก 10) ส่งได้ครั้งเดียว ระบบสลับลำดับตัวเลือกและตรวจให้อัตโนมัติ</li></ul>
<p>ออกจากเต็มจอไปแล้ว <b>${me.fs_exits}</b> ครั้ง${susp()?` <span class="err">| ถูกระงับถึง ${fmt(me.suspended_until)}</span>`:''}</p></div>
<div class="grid">${U.map((u,i)=>`<button class="unit" data-n="${i+1}"><b>หน่วยที่ ${i+1}</b><span>${esc(u.t)}</span><small>${st(i+1)}</small></button>`).join('')}</div>`;
 bindLo();document.querySelectorAll('.unit').forEach(b=>b.onclick=()=>unitView(+b.dataset.n))}

async function unitView(n,step){await refreshMe();await loadSubs();const u=U[n-1],r=got(n,'read'),w=got(n,'work'),e=got(n,'exam');
 step=step||(!r?'read':!w?'work':'exam');
 const tab=(k,l,on)=>`<button class="${step===k?'on':''}" data-s="${k}" ${on?'':'disabled'}>${l}</button>`;
 let body='';
 if(step==='read')body=u.k?`<div class="a4">${u.k}</div>${r?'':'<button id="rd">อ่านจบแล้ว ปลดล็อกใบงาน</button>'}`:`<div class="card">เนื้อหาหน่วยนี้กำลังจัดทำ</div>`;
 else if(step==='work')body=workHtml(n,u,w);
 else body=examHtml(n,u,w,e);
 app.innerHTML=`${bar()}<div class="card bar"><b>หน่วยที่ ${n} ${esc(u.t)}</b><span><button class="alt" id="bk">กลับหน้าหลัก</button></span></div><div class="tabs">${tab('read','1 ใบความรู้',1)}${tab('work','2 ใบงาน',!!r)}${tab('exam','3 ข้อสอบ',!!w)}</div>${body}`;
 bindLo();$('#bk').onclick=home;
 document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>unitView(n,b.dataset.s));
 if($('#rd'))$('#rd').onclick=async()=>{await sb.from('web_submissions').insert({student_id:me.id,unit:n,kind:'read'});unitView(n,'work')};
 if($('#sw'))$('#sw').onclick=()=>submitWork(n);
 if($('#ex'))$('#ex').onclick=()=>startExam(n)}
function workHtml(n,u,w){
 if(!u.w.length)return`<div class="card">ใบงานหน่วยนี้กำลังจัดทำ</div>`;
 if(w)return`<div class="card"><p class="ok">ส่งใบงานแล้ว เมื่อ ${fmt(w.submitted_at)} ${w.is_late?'<i class="late">ส่งช้า</i>':''}</p>${u.w.map((q,i)=>`<p><b>${i+1}. ${esc(q)}</b><br>${esc(w.answer[i])}</p>`).join('')}</div>`;
 if(blocked('work'))return`<div class="card err">ถูกระงับการทำใบงานถึง ${fmt(me.suspended_until)}</div>`;
 return`<div class="card">${u.w.map((q,i)=>`<p><b>${i+1}. ${esc(q)}</b></p><textarea rows="4" class="wa" placeholder="พิมพ์คำตอบ"></textarea>`).join('')}<button id="sw">ส่งใบงาน</button><p id="wm" class="err"></p></div>`}
async function submitWork(n){await refreshMe();if(blocked('work'))return unitView(n,'work');
 const ans=[...document.querySelectorAll('.wa')].map(t=>t.value.trim());
 if(ans.some(a=>a.length<3)){$('#wm').textContent='กรุณาตอบให้ครบทุกข้อ';return}
 const{data:f}=await sb.from('web_submissions').select('submitted_at').eq('unit',n).eq('kind','work').order('submitted_at').limit(1);
 const late=!!(f&&f.length&&Date.now()-new Date(f[0].submitted_at)>C.LATE_HOURS*36e5);
 const{error}=await sb.from('web_submissions').insert({student_id:me.id,unit:n,kind:'work',answer:ans,is_late:late});
 if(error){$('#wm').textContent='ส่งไม่สำเร็จ หรือเคยส่งแล้ว';return}
 unitView(n,'exam')}
function examHtml(n,u,w,e){
 if(!u.q.length)return`<div class="card">ข้อสอบหน่วยนี้กำลังจัดทำ</div>`;
 if(e)return`<div class="card"><h3 class="ok">ส่งใบงานและสอบสำเร็จ</h3><p>คะแนนสอบ ${e.score}/${u.q.length}</p></div>`;
 if(blocked('exam'))return`<div class="card err">ถูกระงับการสอบถึง ${fmt(me.suspended_until)}</div>`;
 return`<div class="card"><p>ข้อสอบ ${u.q.length} ข้อ ส่งได้ครั้งเดียว ระหว่างสอบจะย้อนไปอ่านใบความรู้ไม่ได้</p><button id="ex">เริ่มทำข้อสอบ</button></div>`}
function startExam(n){const u=U[n-1];const ord=u.q.map(()=>shuffle([0,1,2,3]));
 app.innerHTML=`<div class="card bar"><b>ข้อสอบหน่วยที่ ${n}</b></div>${u.q.map((q,i)=>`<div class="q"><b>${i+1}. ${esc(q.q)}</b>${ord[i].map((o,j)=>`<label><input type="radio" name="q${i}" value="${o}" style="width:auto"> ${'กขคง'[j]}. ${esc(q.o[o])}</label>`).join('')}</div>`).join('')}<button id="se">ส่งข้อสอบ</button><p id="em" class="err"></p>`;
 $('#se').onclick=async()=>{await refreshMe();if(blocked('exam')){alert('ถูกระงับการสอบ');return home()}
  const pick=u.q.map((q,i)=>{const c=document.querySelector(`input[name=q${i}]:checked`);return c?+c.value:null});
  if(pick.includes(null)&&!confirm('ยังตอบไม่ครบ ต้องการส่งเลยหรือไม่'))return;
  const score=pick.filter(p=>p===0).length;
  const{error}=await sb.from('web_submissions').insert({student_id:me.id,unit:n,kind:'exam',answer:pick,score});
  if(error){$('#em').textContent='ส่งไม่สำเร็จ หรือเคยส่งแล้ว';return}
  unitView(n,'exam')}}

async function adminView(){
 const[{data:st},{data:sm}]=await Promise.all([sb.from('web_students').select('*').order('room').order('id'),sb.from('web_submissions').select('*')]);
 const g=(id,n,k)=>sm.find(s=>s.student_id===id&&s.unit===n&&s.kind===k);
 const now=new Date();
 app.innerHTML=`${bar()}<div class="card"><b>ผลของนักศึกษาทุกคน</b> (คลิกช่องของหน่วยเพื่อดูคำตอบ/ลบผลงาน ช่องแสดง ใบงาน | คะแนนสอบ)</div><div class="tw"><table class="t"><tr><th>ห้อง</th><th>รหัส</th><th>ชื่อ</th><th>ออกเต็มจอ</th><th>ระงับ</th>${U.map((u,i)=>`<th>หน่วย ${i+1}</th>`).join('')}</tr>
${st.map(s=>{const sp=s.suspended_until&&new Date(s.suspended_until)>now;return`<tr><td>${esc(s.room)}</td><td>${esc(s.id)}</td><td>${esc(s.name)}</td><td>${s.fs_exits}</td><td>${sp?esc(fmt(s.suspended_until))+` <button class="bad cl" data-id="${esc(s.id)}">ล้าง</button>`:(s.fs_exits?`<button class="alt cl" data-id="${esc(s.id)}">รีเซ็ต</button>`:'-')}</td>${U.map((u,i)=>{const w=g(s.id,i+1,'work'),e=g(s.id,i+1,'exam');return`<td class="c" data-id="${esc(s.id)}" data-n="${i+1}">${w?'✔':'–'}${w&&w.is_late?'<i class="late">ช้า</i>':''} | ${e?e.score:'–'}</td>`}).join('')}</tr>`}).join('')}</table></div>`;
 bindLo();
 document.querySelectorAll('.cl').forEach(b=>b.onclick=async()=>{await sb.from('web_students').update({suspended_until:null,suspend_scope:null,fs_exits:0}).eq('id',b.dataset.id);adminView()});
 document.querySelectorAll('td.c').forEach(td=>td.onclick=()=>detail(td.dataset.id,+td.dataset.n,st,sm))}
function detail(id,n,st,sm){const s=st.find(x=>x.id===id),u=U[n-1],w=sm.find(x=>x.student_id===id&&x.unit===n&&x.kind==='work'),e=sm.find(x=>x.student_id===id&&x.unit===n&&x.kind==='exam');
 const m=document.createElement('div');m.className='modal';
 m.innerHTML=`<div><h3>${esc(s.name)} หน่วยที่ ${n}</h3>${w?`<p>ส่งใบงาน ${fmt(w.submitted_at)} ${w.is_late?'<i class="late">ส่งช้า</i>':''}</p>${u.w.map((q,i)=>`<p><b>${i+1}. ${esc(q)}</b><br>${esc(w.answer[i])}</p>`).join('')}`:'<p>ยังไม่ส่งใบงาน</p>'}<p>คะแนนสอบ: ${e?e.score+'/'+u.q.length:'ยังไม่สอบ'}</p><button class="bad" id="dl">ลบผลงานหน่วยนี้ (ให้ทำใหม่)</button> <button class="alt" id="cx">ปิด</button></div>`;
 document.body.appendChild(m);$('#cx').onclick=()=>m.remove();
 $('#dl').onclick=async()=>{if(!confirm('ลบอ่าน/ใบงาน/ข้อสอบของหน่วยนี้ใช่หรือไม่'))return;await sb.from('web_submissions').delete().eq('student_id',id).eq('unit',n);m.remove();adminView()}}
loginView();
