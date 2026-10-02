(function(root){
 'use strict';
 const CHAINS=[
  {id:'rice',name:'논 식당',icon:'🌾',color:'#edb53b',unlock:0,names:['벼','메뚜기','개구리','뱀'],icons:['🌾','🦗','🐸','🐍'],note:'벼를 먹는 메뚜기, 메뚜기를 먹는 개구리, 개구리를 먹는 뱀이 이어져요.',source:'교과서 47쪽',labels:['벼','메뚜기','개구리','뱀']},
  {id:'clover',name:'풀숲 식당',icon:'☘️',color:'#5bad66',unlock:4,names:['토끼풀','애벌레','참새','검독수리'],icons:['☘️','🐛','🐦','🦅'],note:'애벌레는 토끼풀을 먹어요. 참새는 애벌레를, 검독수리는 참새를 먹어요.',source:'지도서 198쪽',labels:['토끼풀','애벌레','참새','검독수리']},
  {id:'meadow',name:'풀밭 식당',icon:'🌼',color:'#ef904d',unlock:9,names:['민들레 잎','토끼','여우'],icons:['🌼','🐇','🦊'],note:'토끼는 민들레의 잎을 먹어요. 여우는 토끼를 먹을 수 있어요.',source:'추가 먹이사슬 · RSPCA, Woodland Trust',labels:['민들레 잎','토끼','여우']},
  {id:'forest',name:'숲 식당',icon:'🌳',color:'#8f6a4f',unlock:15,names:['참나무(도토리)','들쥐','올빼미'],icons:['🌳','🐁','🦉'],note:'들쥐는 참나무의 열매인 도토리를 먹고, 올빼미는 들쥐를 먹어요. 카드에는 실제 먹이인 도토리를 함께 표시해요.',source:'추가 먹이사슬 · Woodland Trust',labels:['도토리','들쥐','올빼미']},
  {id:'kelp',name:'바닷말 식당',icon:'🌊',color:'#319a91',unlock:22,names:['큰 바닷말','성게','해달','범고래'],icons:['🌿','🟣','🦦','🐋'],note:'성게는 큰 바닷말을 먹고, 해달은 성게를 먹어요. 일부 범고래는 해달도 먹어요. 범고래 무리마다 먹이가 달라요.',source:'추가 먹이사슬 · Monterey Bay Aquarium, NOAA',labels:['큰 바닷말','성게','해달','범고래']},
  {id:'antarctic',name:'남극 식당',icon:'❄️',color:'#568fd3',unlock:30,names:['식물성 플랑크톤','크릴','젠투펭귄','표범물범'],icons:['🦠','🦐','🐧','🦭'],note:'아주 작은 식물성 플랑크톤을 크릴이 먹어요. 젠투펭귄은 크릴을, 표범물범은 펭귄을 먹어요. 크릴은 새우처럼 생긴 작은 바다 동물이에요.',source:'추가 먹이사슬 · British Antarctic Survey',labels:['식물성 플랑크톤','크릴','젠투펭귄','표범물범']}
 ];
 const key=(chain,tier)=>`${chain}:${tier}`;
 const cardInfo=card=>{if(typeof card!=='string')return null;const [id,n]=card.split(':');const chain=CHAINS.find(c=>c.id===id);const tier=Number(n);return chain&&Number.isInteger(tier)&&tier>=0&&tier<chain.names.length?{chain,tier,name:chain.names[tier],label:chain.labels[tier],icon:chain.icons[tier]}:null;};
 function createGame(random=Math.random){
  let state={started:false,board:Array(24).fill(null),customers:[],coins:0,decorations:0,completed:false,served:0,unlocked:['rice'],selected:null,paused:false,pendingUnlock:null,customerCapacity:3,elapsed:0,supplyElapsed:0,customerElapsed:0,nextCustomerId:1,supplyTurn:0,totalMerges:0,missed:0,antarcticServed:0,nextChain:null,totalEarned:0,urgentServed:0,servedChains:[]};
  const result=(ok,message,extra={})=>({ok,message,...extra});
  const unlockedChains=()=>CHAINS.filter(c=>state.unlocked.includes(c.id));
  const liveChains=unlockedChains;
  function replenish(){
   if(!state.started||state.paused||state.pendingUnlock)return result(false,'지금은 게임이 쉬고 있어요.');
   const added=[],changed=[];
   const customers=[...state.customers].sort((a,b)=>Number(b.urgent)-Number(a.urgent));
   // All new cards are producers. Their binary merge value guarantees a recipe,
   // while the child still chooses which cards to merge and whom to feed.
   const value=(id,tier)=>state.board.reduce((n,card)=>{const x=cardInfo(card);return n+(x&&x.chain.id===id&&x.tier<=tier?2**x.tier:0);},0);
   for(const c of customers){
    const tier=c.tier-1,need=Math.max(0,2**tier-value(c.chain,tier));
    let missing=need;
    while(missing>0){
     let slot=state.board.indexOf(null);
     if(slot<0){slot=state.board.findIndex(card=>{const x=cardInfo(card);if(!x||x.tier!==0||x.chain.id===c.chain)return false;
      const demand=customers.filter(o=>o.chain===x.chain.id).reduce((n,o)=>n+2**(o.tier-1),0);
      return value(x.chain.id,99)>demand;
     });}
     if(slot<0)break;
     if(state.board[slot])changed.push(slot);else added.push(slot);
     state.board[slot]=key(c.chain,0);missing--;
    }
   }
   const desired=[...new Set(customers.map(c=>c.chain))];
   const choices=desired.length?desired:state.unlocked;
   let n=0;
   while(state.board.filter(x=>x===null).length>2){
    const empty=state.board.map((x,i)=>x===null?i:-1).filter(i=>i>=0);
    const slot=empty[Math.floor(random()*empty.length)];
    state.board[slot]=key(choices[n++%choices.length],0);added.push(slot);
   }
   state.selected=null;
   const slots=[...added,...changed];
   return result(true,slots.length?'먹이 도착! 같은 카드끼리 합쳐 보세요.':'먹이가 충분해요! 합치거나 손님에게 서빙해 보세요.',{kind:'supply',slots,count:slots.length});
  }
  function spawnCustomer(forcedChain,forcedTier,forcedUrgent){
   if(state.customers.length>=state.customerCapacity)return null;
   const options=liveChains();
   if(!options.length)return null;
   const preferred=forcedChain||state.nextChain;const chain=preferred?options.find(c=>c.id===preferred):options[Math.floor(random()*options.length)];if(!chain)return null;if(!forcedChain&&state.nextChain)state.nextChain=null;
   const tier=forcedTier??(1+Math.floor(random()*(chain.names.length-1)));
   if(!Number.isInteger(tier)||tier<1||tier>=chain.names.length)return null;
   const urgent=forcedUrgent??(state.served>=8&&!state.customers.some(c=>c.urgent)&&random()<.2);
   const duration=35+((2**(tier-1))-1)*9;
   const customer={id:state.nextCustomerId++,chain:chain.id,tier,urgent,total:duration,left:duration};
   state.customers.push(customer);return customer;
  }
  function start(){if(state.started)return result(false,'이미 영업 중이에요.');state.started=true;spawnCustomer('rice',1,false);spawnCustomer('rice',2,false);spawnCustomer('rice',3,false);replenish();return result(true,'영업을 시작했어요!');}
  function merge(from,to){
   if(!state.started||state.paused||state.pendingUnlock)return result(false,'지금은 게임이 쉬고 있어요.');
   if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=state.board.length||to>=state.board.length||from===to)return result(false,'서로 다른 접시를 골라 주세요.');
   const a=state.board[from],b=state.board[to];if(!a)return result(false,'빈 접시는 옮길 수 없어요.');
   if(!b){state.board[to]=a;state.board[from]=null;state.selected=null;return result(true,'접시를 옮겼어요.',{kind:'move'});}
   if(a!==b)return result(false,'같은 생물 카드 두 개를 합쳐 주세요.');
   const info=cardInfo(a);if(info.tier>=info.chain.names.length-2)return result(false,'이 카드는 마지막 손님에게 서빙해 주세요.');
   state.board[to]=key(info.chain.id,info.tier+1);state.board[from]=null;state.selected=null;state.totalMerges++;
   return result(true,`${info.chain.names[info.tier+1]}는 ${info.name}${particle(info.name,'을','를')} 먹어요!`,{kind:'merge',slot:to});
  }
  function serve(slot,id){
   if(!state.started||state.paused||state.pendingUnlock)return result(false,'지금은 게임이 쉬고 있어요.');
   if(!Number.isInteger(slot)||slot<0||slot>=state.board.length)return result(false,'접시를 먼저 골라 주세요.');
   const customer=state.customers.find(c=>c.id===id),info=cardInfo(state.board[slot]);
   if(!customer||!info)return result(false,'접시와 손님을 확인해 주세요.');
   const chain=CHAINS.find(c=>c.id===customer.chain);
   if(info.chain.id!==customer.chain||info.tier!==customer.tier-1)return result(false,`${chain.names[customer.tier]} 손님의 먹이는 도감에서 확인해 보세요.`,{kind:'wrong'});
   const reward=Math.round(10*2**info.tier*(1+CHAINS.findIndex(c=>c.id===customer.chain)*.05)*(customer.urgent?1.5:1));
   state.board[slot]=null;state.customers=state.customers.filter(c=>c.id!==id);state.selected=null;state.coins+=reward;state.totalEarned+=reward;state.served++;if(customer.urgent)state.urgentServed++;if(!state.servedChains.includes(customer.chain))state.servedChains.push(customer.chain);if(customer.chain==='antarctic')state.antarcticServed++;
   const next=CHAINS.find(c=>!state.unlocked.includes(c.id)&&state.served>=c.unlock);
   if(next){state.unlocked.push(next.id);state.pendingUnlock=next.id;}
   return result(true,`맛있게 먹었어요! +${reward}원`,{kind:'serve',reward,customer:{...customer},unlocked:next?.id||null});
  }
  function particle(word,a,b){const code=word.charCodeAt(word.length-1)-44032;return code>=0&&code<=11171&&code%28!==0?a:b;}
  function returnCard(slot){if(!state.started||state.paused||state.pendingUnlock)return result(false,'지금은 게임이 쉬고 있어요.');if(!Number.isInteger(slot)||!state.board[slot])return result(false,'돌려놓을 접시를 먼저 골라 주세요.');state.board[slot]=null;state.selected=null;return result(true,'접시를 돌려놨어요. 먹이 보충 버튼으로 다시 채울 수 있어요.');}
  function acknowledgeUnlock(){const id=state.pendingUnlock;if(!id)return result(false,'확인할 안내가 없어요.');state.pendingUnlock=null;state.nextChain=id;return result(true,'새로운 손님과 먹이가 함께 등장해요!',{ending:checkEnding()});}
  function checkEnding(){if(!state.completed&&state.decorations===3&&state.unlocked.length===CHAINS.length&&!state.pendingUnlock){state.completed=true;return true;}return false;}
  function decorate(){
   if(!state.started||state.paused||state.pendingUnlock)return result(false,'영업 화면에서 꾸며 주세요.');
   if(state.decorations>=3)return result(false,'식당 꾸미기가 완성됐어요!');
   if(state.decorations===2&&(state.unlocked.length<CHAINS.length||state.antarcticServed<1))return result(false,'여섯 먹이사슬을 모두 열고 남극 손님에게 한 접시 서빙해 주세요.');
   const costs=[150,300,500],names=['나무 간판','꽃과 나무','꽃무늬 축제'],cost=costs[state.decorations];
   if(state.coins<cost)return result(false,`${cost}원이 필요해요. 손님에게 서빙해 보세요.`);
   const name=names[state.decorations];state.coins-=cost;state.decorations++;
   return result(true,`${name} 완성!`,{kind:'decorate',ending:checkEnding()});
  }
  function tick(dt){
   if(!state.started||state.paused||state.pendingUnlock)return {changed:false};
   dt=Math.min(1,Math.max(0,dt));let changed=false;state.elapsed+=dt;state.customerElapsed+=dt;
   for(const customer of state.customers){if(customer.urgent)customer.left-=dt;}
   const expired=state.customers.filter(c=>c.urgent&&c.left<=0);
   if(expired.length){state.customers=state.customers.filter(c=>!expired.includes(c));state.missed+=expired.length;changed=true;}
   if(state.customerElapsed>=2.4){state.customerElapsed=0;if(spawnCustomer())changed=true;}
   return {changed,expired:expired.length};
  }
  function select(slot){state.selected=Number.isInteger(slot)&&state.board[slot]?slot:null;}
  function pause(value){state.paused=!!value;}
  function snapshot(){return JSON.parse(JSON.stringify(state));}
  return {start,merge,serve,returnCard,replenish,acknowledgeUnlock,decorate,tick,select,pause,snapshot,get state(){return state;},spawnCustomer};
 }
 root.DinerEngine={CHAINS,cardInfo,key,createGame};
 if(typeof module!=='undefined'&&module.exports)module.exports=root.DinerEngine;
})(typeof window!=='undefined'?window:globalThis);

