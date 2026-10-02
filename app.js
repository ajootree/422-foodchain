(()=>{
 'use strict';
 const {CHAINS,cardInfo,createGame}=DinerEngine;
 let game=createGame(),modalOpen=false,soundOn=false,audio=null,lastTime=performance.now(),toastTimer=null,drag=null,ignoreClick=false,restoreFocus=null,guideTab='all',tutorial=-1,featureTip=null;
 let restaurantName='숲속 식당',recordId=Date.now()+'-'+Math.random().toString(36).slice(2);
 const customerSeats=new Map(),happyCustomers=new Map(),seenFeatures=new Set();
 const $=id=>document.getElementById(id);
 const chainBy=id=>CHAINS.find(c=>c.id===id);
 function foodHtml(card){const x=cardInfo(card);return `<span class="chain-mark" style="background:${x.chain.color}"></span><span class="tier" aria-hidden="true">${'•'.repeat(x.tier+1)}</span><span class="food-icon" aria-hidden="true">${x.icon}</span><span class="food-name">${x.label}</span>`;}
 function diagram(chain){return `<div class="chain-diagram">${chain.names.map((name,i)=>`${i?'<span class="chain-arrow" aria-label="먹히고">→</span>':''}<div class="chain-node"><span class="discovery-level">${i+1}</span><span aria-hidden="true">${chain.icons[i]}</span><strong>${name}</strong></div>`).join('')}</div>`;}
 function renderBoard(fresh=-1){
  $('board').style.setProperty('--rows',game.state.board.length/6);

  $('board').innerHTML=game.state.board.map((card,i)=>`<button class="slot ${card?'filled':''} ${game.state.selected===i?'selected':''} ${fresh===i?'fresh':''}" data-slot="${i}" aria-label="${i+1}번 접시: ${card?cardInfo(card).name:'빈자리'}" aria-pressed="${game.state.selected===i}">${card?foodHtml(card):''}</button>`).join('');
  $('selectionHint').textContent=game.state.selected===null?'누르거나 드래그':`${cardInfo(game.state.board[game.state.selected]).label} 선택됨`;
 }
 function renderCustomers(){
  $('customers').style.gridTemplateColumns=`repeat(${game.state.customerCapacity},minmax(0,1fr))`;
  const liveIds=new Set(game.state.customers.map(c=>c.id));
  for(const id of customerSeats.keys())if(!liveIds.has(id)&&!happyCustomers.has(id))customerSeats.delete(id);
  for(const c of game.state.customers)if(!customerSeats.has(c.id)){
   const occupied=new Set(customerSeats.values());
   for(let seat=0;seat<game.state.customerCapacity;seat++)if(!occupied.has(seat)){customerSeats.set(c.id,seat);break;}
  }
  let html=Array.from({length:game.state.customerCapacity},(_,seat)=>{
   const id=[...customerSeats].find(([,n])=>n===seat)?.[0];
   const happy=happyCustomers.get(id);
   if(happy){const c=happy.customer,chain=chainBy(c.chain);return `<div class="customer delighted" role="status" aria-live="polite" aria-label="${chain.names[c.tier]} 손님이 기쁘게 먹었어요, ${happy.reward}원 획득"><span class="bubble">냠냠! 맛있다!</span><span class="happy-animal"><span class="animal" aria-hidden="true">${chain.icons[c.tier]}</span><span class="happy-face" aria-hidden="true">😄</span><span class="happy-heart heart-one" aria-hidden="true">♥</span><span class="happy-heart heart-two" aria-hidden="true">♥</span></span><strong>${chain.names[c.tier]}</strong><span class="reward happy-reward">🪙 +${happy.reward}원</span></div>`;}
   const c=game.state.customers.find(c=>c.id===id);
   if(!c)return '<div class="customer empty"><span>🪑</span><small>다음 손님을 기다려요</small></div>';

   const chain=chainBy(c.chain);
   return `<button class="customer ${c.urgent?'urgent':''} " data-customer="${c.id}" aria-label="${chain.names[c.tier]} 손님${c.urgent?', 급한 손님':''}"><span class="bubble">${c.urgent?'조금 급해요!':'배고파!'}</span><span class="animal" aria-hidden="true">${chain.icons[c.tier]}</span><span class="customer-name-row"><strong>${chain.names[c.tier]}</strong>${c.urgent?'':''}</span>${c.urgent?'<span class="reward">':'<span hidden>'}${c.urgent?'<span data-time="'+c.id+'">'+Math.ceil(c.left)+'초</span> · 보너스 1.5배':''}</span>${c.urgent?`<span class="patience-track"><i data-patience="${c.id}" style="width:${Math.max(0,c.left/c.total*100)}%"></i></span>`:''}</button>`;
  }).join('');
  $('customers').innerHTML=html;
 }
 function renderSidebar(){
  const s=game.state; $('coins').innerHTML=`${s.coins.toLocaleString()}<span>원</span>`;$('servedLabel').textContent=`서빙 ${s.served}접시`;
  const next=CHAINS.find(c=>!s.unlocked.includes(c.id)),previous=CHAINS.filter(c=>s.unlocked.includes(c.id)).at(-1).unlock;
  $('nextTitle').textContent=next?`${next.icon} ${next.name}`:'모든 식당을 열었어요!';
  $('progressText').textContent=next?`${next.unlock-s.served}접시만 더! (${s.served}/${next.unlock})`:(s.antarcticServed<1?'남극 손님에게 한 접시 서빙해요!':'마지막 꽃무늬 축제를 꾸며 보세요!');
  $('progressFill').style.width=next?`${Math.min(100,(s.served-previous)/(next.unlock-previous)*100)}%`:'100%';
  $('unlockDots').innerHTML=CHAINS.map((c,i)=>`<span class="${s.unlocked.includes(c.id)?'done':''}" title="${c.name}">${s.unlocked.includes(c.id)?'✓':i+1}</span>`).join('');
  const stage=s.decorations,costs=[150,300,500],names=['나무 간판 달기','꽃과 나무 심기','꽃무늬 축제 꾸미기'];
  document.querySelector('.diner').dataset.decor=stage;
  $('restaurantTitle').textContent=stage?restaurantName:'배고픈 손님들';
  $('finishBusiness').disabled=!s.started;$('viewRecords').disabled=false;
  document.querySelector('.brand h1').textContent=game.state.started?restaurantName:'먹이사슬 식당';
  const finalLocked=stage===2&&(s.unlocked.length<6||s.antarcticServed<1);
  $('decorateButton').disabled=stage===3||finalLocked||s.coins<costs[stage];
  $('decorName').textContent=stage===3?'꾸미기 완성!':names[stage];$('decorCost').textContent=stage===3?'✓':finalLocked?'🔒':`${costs[stage]}원`;
  $('decorSteps').innerHTML=['🪧','🌷','🎉'].map((icon,i)=>`<span class="${stage>i?'done':''}" title="${names[i]}">${stage>i?icon:'🔒'}</span>`).join('');
  $('goalText').textContent=s.completed?'숲속 식당 완성! 계속 영업해도 좋아요.':finalLocked?(s.unlocked.length<6?'6단계까지 열면 마지막 꾸미기에 도전!':'남극 손님에게 1접시 서빙하면 잠금 해제!'):`먹이사슬 ${s.unlocked.length}/6 · 꾸미기 ${stage}/3`;

 }
 function render(fresh=-1){renderBoard(fresh);renderCustomers();renderSidebar();renderTutorial();}
 function renderTutorial(){
  if(featureTip){renderFeatureTip();return;}
  document.querySelectorAll('.tutorial-target').forEach(el=>el.classList.remove('tutorial-target'));
  for(const b of document.querySelectorAll('button[data-tutorial-disabled]')){b.disabled=b.dataset.tutorialDisabled==='true';delete b.dataset.tutorialDisabled;}
  $('tutorialShade').toggleAttribute('hidden',tutorial<0);$('tutorial').hidden=tutorial<0;if(tutorial<0)return;

  const text=['벼를 골라 메뚜기 손님에게 주세요.','같은 벼 카드 두 장을 합쳐 메뚜기를 만들어 보세요.','만든 메뚜기를 개구리 손님에게 주세요.','생태계 먹이 보충을 눌러 빈칸을 채워 보세요.'];
  $('tutorialStep').textContent=`연습 ${tutorial+1} / 4`;$('tutorialText').textContent=text[tutorial];
  const card=tutorial===2?'rice:1':'rice:0';
  if(tutorial<3){const slots=game.state.board.map((c,i)=>c===card?i:-1).filter(i=>i>=0).slice(0,tutorial===1?2:1);for(const i of slots)$('board').querySelector(`[data-slot="${i}"]`)?.classList.add('tutorial-target');}
  if(tutorial===0||tutorial===2){const c=game.state.customers.find(c=>c.chain==='rice'&&c.tier===(tutorial===0?1:2));if(c)$('customers').querySelector(`[data-customer="${c.id}"]`)?.classList.add('tutorial-target');}
  if(tutorial===3)$('fountainButton').classList.add('tutorial-target');
  for(const b of document.querySelectorAll('button'))if(!b.classList.contains('tutorial-target')&&b.id!=='skipTutorial'){b.dataset.tutorialDisabled=String(b.disabled);b.disabled=true;}
  requestAnimationFrame(updateTutorialShade);

 }
 function updateTutorialShade(){
  if(tutorial<0&&!featureTip)return;
  $('tutorialHoles').innerHTML=[...document.querySelectorAll('.tutorial-target')].map(el=>{const r=el.getBoundingClientRect();return `<rect x="${r.x-5}" y="${r.y-5}" width="${r.width+10}" height="${r.height+10}" rx="16" fill="black"/>`;}).join('');
 }
 window.addEventListener('resize',updateTutorialShade);window.addEventListener('scroll',updateTutorialShade,true);
 function renderFeatureTip(){
  document.querySelectorAll('.tutorial-target').forEach(el=>el.classList.remove('tutorial-target'));
  $('tutorial').hidden=false;$('tutorialShade').removeAttribute('hidden');
  const targets=[...document.querySelectorAll(featureTip.selector)],el=targets[0];targets.forEach(target=>target.classList.add('tutorial-target'));
  $('tutorial').style.top=featureTip.selector.includes('data-customer')?Math.min((el?.getBoundingClientRect().bottom||150)+12,innerHeight-160)+'px':'';
  $('tutorialStep').textContent=featureTip.title;$('tutorialText').textContent=featureTip.text;$('skipTutorial').textContent='알겠어요!';
  requestAnimationFrame(updateTutorialShade);
 }
 function showFeatureTip(type,selector,title,text){
  seenFeatures.add(type);featureTip={selector,title,text};game.pause(true);renderFeatureTip();
 }
 function closeFeatureTip(){featureTip=null;$('tutorial').style.top='';game.pause(false);$('skipTutorial').textContent='건너뛰기';render();lastTime=performance.now();}
 function showReturnTip(){
  if(tutorial>=0||modalOpen||featureTip||drag||seenFeatures.has('return')||!game.state.started)return;
  const cards=game.state.board.filter(Boolean);
  // With few cards, replenishing is the useful next action. Also wait for all guests to arrive.
  if(cards.length<=4||game.state.customers.length<game.state.customerCapacity)return;
  const counts=new Map();let canMerge=false,canServe=false;
  for(const card of cards){
   const info=cardInfo(card);counts.set(card,(counts.get(card)||0)+1);
   if(counts.get(card)>=2&&info.tier<info.chain.names.length-2)canMerge=true;
   if(game.state.customers.some(c=>c.chain===info.chain.id&&c.tier===info.tier+1))canServe=true;
  }
  if(canMerge||canServe)return;
  showFeatureTip('return','#returnButton','합치거나 서빙할 먹이가 없나요?','돌려놓을 접시를 여기로 끌어보세요. 빈칸을 만들고 먹이를 다시 보충할 수 있어요. 접시를 누른 뒤 이 칸을 눌러도 돼요.');
 }
 function setupTutorial(step){
  tutorial=step;game.state.board.fill(null);game.state.customers=[];game.state.selected=null;customerSeats.clear();happyCustomers.clear();
  if(step===0){game.state.board[7]='rice:0';game.spawnCustomer('rice',1,false);}
  if(step===1){game.state.board[7]=game.state.board[8]='rice:0';}
  if(step===2){game.state.board[8]='rice:1';game.spawnCustomer('rice',2,false);}
 }
 function finishTutorial(){tutorial=-1;game=createGame();customerSeats.clear();happyCustomers.clear();game.start();render();notify('연습 끝! 이제 손님의 먹이를 직접 골라 주세요.');}
 document.addEventListener('click',e=>{if((tutorial>=0||featureTip)&&!e.target.closest('.tutorial-target,#skipTutorial')){e.preventDefault();e.stopImmediatePropagation();}},true);

 $('skipTutorial').onclick=()=>{if(featureTip)closeFeatureTip();else finishTutorial();};
 function notify(message,error=false){$('toast').textContent=message;$('toast').className=`toast show ${error?'error':''}`;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2600);}
 function play(kind){
  if(!soundOn)return;
  try{audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume();const notes=kind==='wrong'?[190,140]:kind==='merge'?[430,640]:kind==='unlock'?[523,659,784,1046]:[660,880];notes.forEach((f,i)=>{const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+i*.09;o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.07,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+.16);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+.17);});}catch{}
 }
 function finishAction(r){
  if(r.ok&&tutorial>=0){
   if(tutorial===0&&r.kind==='serve'&&r.customer.chain==='rice'&&r.customer.tier===1)setupTutorial(1);
   else if(tutorial===1&&r.kind==='merge'&&game.state.board[r.slot]==='rice:1')setupTutorial(2);
   else if(tutorial===2&&r.kind==='serve'&&r.customer.chain==='rice'&&r.customer.tier===2)setupTutorial(3);
   else if(tutorial===3&&r.kind==='supply')finishTutorial();
  }
  if(r.ok&&r.kind==='serve'&&tutorial<0){
   clearTimeout(toastTimer);$('toast').classList.remove('show');
   const servedGame=game;happyCustomers.set(r.customer.id,{customer:r.customer,reward:r.reward});
   setTimeout(()=>{if(game!==servedGame)return;happyCustomers.delete(r.customer.id);customerSeats.delete(r.customer.id);renderCustomers();renderTutorial();},1900);
  }else notify(r.message,!r.ok);
 play(r.ok?r.kind||'serve':'wrong');render(r.slot??-1);if(r.kind==='supply'){r.slots?.forEach((i,n)=>{const cell=$('board').querySelector(`[data-slot="${i}"]`);cell?.classList.add('supplied');cell?.style.setProperty('--delay',`${n*22}ms`);});if(r.ok&&r.slots?.length)showReturnTip();}if(r.unlocked){showUnlock(r.unlocked);}else if(r.ending){notify('꽃무늬 식당 완성! 계속 영업하거나 오늘의 기록을 남겨요.');}return r;}
 function tapSlot(i){
  if(modalOpen)return;const selected=game.state.selected;
  if(selected===null){if(game.state.board[i]){game.select(i);render();}return;}
  if(selected===i){game.select(null);render();return;}
  finishAction(game.merge(selected,i));
 }
 function serveTo(id){if(modalOpen)return;if(game.state.selected===null){notify('먹이 접시를 먼저 골라 주세요.');return;}finishAction(game.serve(game.state.selected,id));}
 function openModal(html){clearTimeout(toastTimer);$('toast').classList.remove('show');restoreFocus=document.activeElement;modalOpen=true;game.pause(true);$('modalContent').innerHTML=html;$('modal').hidden=false;requestAnimationFrame(()=>$('modalContent').querySelector('button')?.focus());}
 function closeModal(){modalOpen=false;$('modal').hidden=true;game.pause(false);lastTime=performance.now();if(restoreFocus?.isConnected)restoreFocus.focus();render();}
 function showWelcome(){openModal(`<span class="modal-icon">🍽️</span><span class="eyebrow">작은 식당, 커다란 먹이사슬</span><h2 id="modalTitle">먹이사슬 식당에 오신 걸 환영해요!</h2><p>같은 먹이 카드 두 장을 합치고,<br>배고픈 손님에게 알맞은 먹이를 주세요.</p><div class="name-block"><label class="name-label" for="restaurantNameInput">✏️ 먼저, 우리 식당 이름을 지어 주세요!</label><input id="restaurantNameInput" class="restaurant-name-input" maxlength="12" placeholder="예: 냠냠 숲속 식당" autocomplete="off" aria-describedby="nameHelp" required><small id="nameHelp" class="name-help">내가 지은 이름이 간판에 들어가요 · 12글자까지</small></div>${diagram(CHAINS[0])}<div class="howto"><div><span>🌱</span><strong>먹이 받기</strong></div><div><span>✨</span><strong>같은 카드 합치기</strong></div><div><span>🍽️</span><strong>손님에게 서빙</strong></div></div><button class="primary" id="startButton">짧게 연습해 보기</button><button class="tutorial-start-skip" id="startWithoutTutorial">바로 시작하기</button>`);const nameInput=$('restaurantNameInput');const updateStart=()=>{const empty=!nameInput.value.trim();$('startButton').disabled=empty;$('startWithoutTutorial').disabled=empty;};nameInput.oninput=updateStart;updateStart();requestAnimationFrame(()=>nameInput.focus());const saveName=()=>{restaurantName=nameInput.value.trim();};$('startButton').onclick=()=>{saveName();closeModal();game.start();setupTutorial(0);render();};$('startWithoutTutorial').onclick=()=>{saveName();closeModal();game.start();tutorial=-1;render();};}
 function showUnlock(id){const c=chainBy(id);play('unlock');openModal(`<span class="modal-icon">${c.icon}</span><span class="eyebrow">새로운 먹이사슬 발견!</span><h2 id="modalTitle">${c.name}이 열렸어요!</h2>${diagram(c)}<div class="learn-copy">${c.note}</div><p class="small-copy">새로운 손님이 찾아와요. 먹이 보충을 누르면 필요한 먹이도 함께 와요.</p><button class="primary" id="unlockConfirm">알겠어요!</button>`);$('unlockConfirm').onclick=()=>{const r=game.acknowledgeUnlock();closeModal();notify(r.message);};}
 const recordKey='food-chain-diner-records-v1';
 const escapeText=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function readRecords(){try{const rows=JSON.parse(localStorage.getItem(recordKey)||'[]');return Array.isArray(rows)?rows.filter(r=>r&&typeof r.name==='string'&&Number.isFinite(r.served)).slice(0,30):[];}catch{return [];}}
 function showBusinessRecord(){
  const s=game.snapshot(),record={id:recordId,name:restaurantName,date:new Date().toISOString(),served:s.served,totalEarned:s.totalEarned,chains:s.servedChains.length,urgent:s.urgentServed,decorations:s.decorations};
  openModal(`<span class="modal-icon">📒</span><span class="eyebrow">오늘의 영업 기록</span><h2 id="modalTitle">${escapeText(restaurantName)}</h2><div class="record-stats"><div><span>🍽️ 서빙한 접시</span><strong>${record.served}접시</strong></div><div><span>🪙 총 번 돈</span><strong>${record.totalEarned.toLocaleString()}원</strong></div><div><span>🌿 만난 먹이사슬</span><strong>${record.chains} / 6</strong></div><div><span>⚡ 급한 손님 서빙</span><strong>${record.urgent}번</strong></div></div><p class="small-copy">총 번 돈에는 꾸미기에 쓴 돈도 포함돼요.<br>기록을 보는 동안 손님들의 시간은 멈춰요.</p><p id="recordSaved" role="status"></p><div class="modal-actions"><button id="saveRecord" class="primary">기록 저장하기</button><button id="returnHome" class="primary" hidden>처음으로</button><button id="continueBusiness" class="secondary">계속 영업하기</button></div><button id="recordHistory" class="records-button">지난 기록 보기</button>`);
  $('saveRecord').onclick=()=>{try{const rows=readRecords().filter(r=>r.id!==record.id);localStorage.setItem(recordKey,JSON.stringify([record,...rows].slice(0,30)));$('recordSaved').textContent='이 기기에 기록을 저장했어요! 오늘 영업은 여기서 마쳐도 좋아요.';$('saveRecord').textContent='저장 완료 ✓';$('saveRecord').disabled=true;$('returnHome').hidden=false;$('returnHome').focus();}catch{$('recordSaved').textContent='이 브라우저에서는 저장할 수 없어요. 기록 화면을 캡처해 주세요.';}};
  $('returnHome').onclick=returnHome;
  if(readRecords().some(r=>r.id===recordId))$('returnHome').hidden=false;
  $('continueBusiness').onclick=closeModal;$('recordHistory').onclick=()=>showRecordHistory(true);
 }
 function returnHome(){game=createGame();recordId=Date.now()+'-'+Math.random().toString(36).slice(2);tutorial=-1;featureTip=null;seenFeatures.clear();customerSeats.clear();happyCustomers.clear();$('tutorial').style.top='';closeModal();showWelcome();}
 function showRecordHistory(fromSummary=false){
  const rows=readRecords();
  openModal(`<span class="modal-icon">📒</span><h2 id="modalTitle">지난 영업 기록</h2><p class="small-copy">이 기기와 브라우저에 저장된 최근 30개 기록이에요.</p><div class="record-history">${rows.map(r=>`<article><strong>${escapeText(r.name)}</strong><small>${escapeText(new Date(r.date).toLocaleString('ko-KR'))}</small><p>🍽️ ${Number(r.served)||0}접시 · 🪙 ${(Number(r.totalEarned)||0).toLocaleString()}원<br>🌿 ${Number(r.chains)||0}/6 · ⚡ ${Number(r.urgent)||0}번</p></article>`).join('')||'<p>아직 저장한 기록이 없어요.</p>'}</div><button id="closeRecords" class="primary">${fromSummary?'오늘 기록으로':'돌아가기'}</button>`);
  $('closeRecords').onclick=fromSummary?showBusinessRecord:closeModal;
 }
 $('finishBusiness').onclick=showBusinessRecord;$('viewRecords').onclick=()=>showRecordHistory();
 function showGuide(tab='all'){
  guideTab=tab;const s=game.state;
  const entries=CHAINS.filter(c=>s.unlocked.includes(c.id)&&(tab==='all'||c.id===tab));
  openModal(`<span class="modal-icon">📖</span><h2 id="modalTitle">먹이사슬 도감</h2><p>화살표는 <b>먹히는 생물 → 먹는 생물</b>이에요.</p><div class="guide-tabs"><button data-guide="all" class="${tab==='all'?'active':''}">모두 보기</button>${CHAINS.filter(c=>s.unlocked.includes(c.id)).map(c=>`<button data-guide="${c.id}" class="${tab===c.id?'active':''}">${c.name}</button>`).join('')}</div>${entries.map(c=>`<article class="guide-entry"><h3>${c.icon} ${c.name}</h3>${diagram(c)}<p>${c.note}</p><p class="small-copy">${c.source}</p></article>`).join('')}<div class="learn-copy">여기서는 각각의 먹이사슬을 연습해요. 자연에서는 한 생물이 여러 종류의 먹이를 먹기도 해요. 마지막 손님은 이 사슬에서 마지막에 놓인 생물이에요.</div><p class="small-copy">그림은 생물을 나타내는 기호예요. 이름을 함께 확인해 주세요.<br>식물성 플랑크톤과 큰 바닷말도 스스로 양분을 만드는 생산자예요.</p><button class="primary" id="closeGuide">식당으로 돌아가기</button>`);
  $('modalContent').querySelectorAll('[data-guide]').forEach(b=>b.onclick=()=>showGuide(b.dataset.guide));$('closeGuide').onclick=closeModal;
 }
 function showPause(){openModal('<span class="modal-icon">☕</span><h2 id="modalTitle">잠깐 쉬어 가요</h2><p>손님과 생태계도 함께 쉬고 있어요.<br>준비되면 다시 문을 열어요!</p><button class="primary" id="resumeButton">계속 영업하기</button>');$('resumeButton').onclick=closeModal;}
 document.addEventListener('click',e=>{
  if(ignoreClick){ignoreClick=false;return;}
  const slot=e.target.closest('[data-slot]');if(slot){tapSlot(Number(slot.dataset.slot));return;}
  const customer=e.target.closest('[data-customer]');if(customer){serveTo(Number(customer.dataset.customer));return;}
 });
 $('guideButton').onclick=()=>showGuide();$('pauseButton').onclick=showPause;
 $('soundButton').onclick=()=>{soundOn=!soundOn;$('soundButton').innerHTML=`♪<span>소리 ${soundOn?'켬':'끔'}</span>`;$('soundButton').title=`소리 ${soundOn?'끄기':'켜기'}`;play('serve');};
 $('returnButton').onclick=()=>{if(!modalOpen)finishAction(game.returnCard(game.state.selected));};
 $('fountainButton').onclick=()=>{if(!modalOpen)finishAction(game.replenish());};
 $('decorateButton').onclick=()=>{if(modalOpen)return;const before=game.state.decorations;finishAction(game.decorate());if(game.state.decorations>before){const scene=document.querySelector('.game-layout');scene.classList.remove('decor-reveal');void scene.offsetWidth;scene.classList.add('decor-reveal');setTimeout(()=>scene.classList.remove('decor-reveal'),1800);}};
 $('restartButton').onclick=()=>{openModal('<span class="modal-icon">🌱</span><h2 id="modalTitle">새 식당으로 다시 시작할까요?</h2><p>지금까지 번 돈과 해금한 메뉴가 초기화돼요.</p><div class="modal-actions"><button class="secondary" id="cancelRestart">계속하기</button><button class="primary" id="confirmRestart">새로 시작</button></div>');$('cancelRestart').onclick=closeModal;$('confirmRestart').onclick=returnHome;};
 // Pointer gestures support both mouse and touch. During a drag, the board is not rebuilt.
 $('board').addEventListener('pointerdown',e=>{
  const target=e.target.closest('[data-slot]');if(!target||modalOpen||featureTip||e.button>0||(tutorial>=0&&!target.classList.contains('tutorial-target')))return;const index=Number(target.dataset.slot);if(!game.state.board[index])return;
  drag={pointer:e.pointerId,from:index,x:e.clientX,y:e.clientY,moved:false};target.setPointerCapture(e.pointerId);
 });
 window.addEventListener('pointermove',e=>{
  if(!drag||drag.pointer!==e.pointerId)return;
  if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>7)drag.moved=true;
  if(!drag.moved)return;e.preventDefault();const ghost=$('dragGhost');ghost.innerHTML=foodHtml(game.state.board[drag.from]);ghost.hidden=false;ghost.style.left=`${e.clientX}px`;ghost.style.top=`${e.clientY}px`;
  document.querySelectorAll('.drop-target').forEach(el=>el.classList.remove('drop-target'));const dest=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-slot],[data-customer],#returnButton');dest?.classList.add('drop-target');
 },{passive:false});
 window.addEventListener('pointerup',e=>{
  if(!drag||drag.pointer!==e.pointerId)return;const gesture=drag;drag=null;$('dragGhost').hidden=true;document.querySelectorAll('.drop-target').forEach(el=>el.classList.remove('drop-target'));
  if(!gesture.moved)return;ignoreClick=true;setTimeout(()=>{ignoreClick=false;},100);
  const dest=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-slot],[data-customer],#returnButton');
  if(tutorial>=0&&!dest?.classList.contains('tutorial-target')){render();return;}
  if(dest?.dataset.slot!==undefined)finishAction(game.merge(gesture.from,Number(dest.dataset.slot)));
  else if(dest?.dataset.customer!==undefined)finishAction(game.serve(gesture.from,Number(dest.dataset.customer)));
  else if(dest?.id==='returnButton')finishAction(game.returnCard(gesture.from));else render();
 });
 window.addEventListener('pointercancel',()=>{drag=null;$('dragGhost').hidden=true;document.querySelectorAll('.drop-target').forEach(el=>el.classList.remove('drop-target'));render();});
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){if(modalOpen&&!game.state.pendingUnlock&&game.state.started)closeModal();else if(!modalOpen){game.select(null);render();}}
  if(e.key==='Tab'&&modalOpen){const buttons=[...$('modalContent').querySelectorAll('button:not(:disabled),a[href],input:not(:disabled)')];if(!buttons.length)return;const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
 });
 document.addEventListener('visibilitychange',()=>{lastTime=performance.now();if(document.hidden&&game.state.started&&!modalOpen)showPause();});
 setInterval(()=>{
  const now=performance.now(),dt=(now-lastTime)/1000;lastTime=now;if(document.hidden)return;
  const r=tutorial>=0?{changed:false}:game.tick(dt);if(r.expired)notify('급한 손님이 떠났어요. 다음 손님에게 서빙해 봐요.');if(r.changed&&!drag)render();
  for(const c of game.state.customers){if(!c.urgent)continue;const time=document.querySelector(`[data-time="${c.id}"]`),bar=document.querySelector(`[data-patience="${c.id}"]`);if(time)time.textContent=`${Math.max(0,Math.ceil(c.left))}초`;if(bar)bar.style.width=`${Math.max(0,c.left/c.total*100)}%`;}
  if(tutorial<0&&!modalOpen&&!featureTip&&game.state.started){
   const urgent=game.state.customers.find(c=>c.urgent);
   if(urgent&&!seenFeatures.has('urgent'))showFeatureTip('urgent',`[data-customer="${urgent.id}"]`,'급한 손님이 왔어요!','시간이 끝나기 전에 알맞은 먹이를 주세요. 성공하면 돈을 1.5배 받아요!');
   else if(game.state.coins>=150&&!seenFeatures.has('decorate'))showFeatureTip('decorate','#decorateButton','이제 식당을 꾸밀 수 있어요!','번 돈으로 나무 간판을 달아 보세요. 여섯 먹이사슬을 만나고 꽃무늬 식당을 완성해 보세요!');
   else showReturnTip();
  }
  const remaining=game.state.board.filter(Boolean).length,free=game.state.board.length-remaining,low=game.state.started&&remaining<=4&&tutorial<0;
  $('supplyLabel').textContent=low?`먹이가 ${remaining}개 남았어요! 눌러서 채워요`:free>2?'누르면 빈칸이 한 번에 채워져요':'필요한 먹이를 준비해 줘요';$('fountainButton').classList.toggle('needs-supply',low);

 },100);
 // The structured tools use exactly the same actions as the visible game.
 const tools=[
  {name:'read_diner_state',title:'식당 상태 보기',description:'Read cards, customers, money and unlocked food chains.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>game.snapshot()},
  {name:'merge_diner_cards',title:'먹이 카드 합치기',description:'Move or merge two visible board slots. Zero-based indexes. Uses the same rules as dragging.',inputSchema:{type:'object',properties:{from:{type:'integer',minimum:0},to:{type:'integer',minimum:0}},required:['from','to'],additionalProperties:false},execute:input=>{if(!input||!Number.isInteger(input.from)||!Number.isInteger(input.to))throw new Error('from and to must be integers');return finishAction(game.merge(input.from,input.to));}},
  {name:'serve_diner_customer',title:'손님에게 서빙',description:'Serve a card from a zero-based board slot to a visible customer ID.',inputSchema:{type:'object',properties:{slot:{type:'integer',minimum:0},customerId:{type:'integer',minimum:1}},required:['slot','customerId'],additionalProperties:false},execute:input=>{if(!input||!Number.isInteger(input.slot)||!Number.isInteger(input.customerId))throw new Error('slot and customerId must be integers');return finishAction(game.serve(input.slot,input.customerId));}}
 ];
 const context=document.modelContext;if(context?.registerTool){const lifecycle=new AbortController();for(const tool of tools){try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}
 window.DinerApp={getState:()=>game.snapshot(),actions:{merge:(a,b)=>finishAction(game.merge(a,b)),serve:(a,b)=>finishAction(game.serve(a,b))},webTools:tools};
 render();showWelcome();
})();
