const express=require('express');
const http=require('http');
const {WebSocketServer}=require('ws');
const path=require('path');
const app=express(); const server=http.createServer(app); const wss=new WebSocketServer({server});
app.use(express.static(path.join(__dirname,'../client'))); app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'../client/index.html')));

const PROFILES=['Raquel','Sara','Carmen Hernandez','Lucía','Carmen gago','Nuria','Rebeca','Marta'];
const COLORS=['rojo','azul','verde','amarillo','morado','rosa','naranja','turquesa'];
const RES=['croquetas','cerveza','chiva','vater','cruz'];
const TERR=['croquetas','cerveza','chiva','vater','cruz'];
const COST={road:{croquetas:1,cerveza:1},settlement:{croquetas:1,cerveza:1,chiva:1,vater:1},city:{vater:2,cruz:3},dev:{chiva:1,vater:1,cruz:1}};
const PROFILE_PIECES={
 Raquel:['⌨','🎾','🧊'],Sara:['💊','🎮','🐴'],'Carmen Hernandez':['🚬','🏟️','🎭'],Lucía:['🥾','⛺','🏥'],'Carmen gago':['💩','🌉','🚇'],Nuria:['🚓','🏢','🔒'],Rebeca:['💨','🐄','🏰'],Marta:['🕶️','🚧','🎧']
};
const DEV_DECK=[...Array(14).fill('caballero'),...Array(5).fill('punto'),...Array(2).fill('monopolio'),...Array(2).fill('abundancia'),...Array(2).fill('construccion')];
const DEV_NAMES={caballero:'El perseguidor',punto:'Punto secreto',monopolio:'Aquí mando yo',abundancia:'Dos por el precio de ninguno',construccion:'Obra y gracia'};
const rooms=new Map();
const uid=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
const code=()=>{let c; do c=Math.random().toString(36).slice(2,7).toUpperCase(); while(rooms.has(c)); return c};
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const emptyRes=()=>Object.fromEntries(RES.map(r=>[r,0]));
const totalRes=p=>RES.reduce((n,r)=>n+p.res[r],0);
const connectedPlayers=room=>Object.entries(room.players).filter(([,p])=>p.connected);
const activeIds=room=>room.order.filter(id=>room.players[id]?.connected);
const makePlayer=(profile,name,color,photo='')=>({profile,name:name||profile,color,photo,res:emptyRes(),dev:[],vp:0,roads:15,settlements:5,cities:4,knights:0,roadsOn:[],settlementsOn:[],citiesOn:[],devNew:{},freeRoads:0,connected:true});

function layoutFor(n){
 if(n<=4)return [3,4,5,4,3];
 if(n===5||n===6)return [3,4,5,6,5,4,3];
 return [3,4,5,6,7,6,5,4,3];
}
function axialForRows(rows){
 const cells=[]; let id=0;
 for(let r=0;r<rows.length;r++){
  const len=rows[r], qStart=-Math.floor((len-1)/2);
  for(let c=0;c<len;c++){const q=qStart+c; const rr=r-Math.floor(rows.length/2); cells.push({id:id++,q,r:rr,row:r,col:c});}
 }
 return cells;
}
function hexCorners(x,y,s){let a=[];for(let i=0;i<6;i++){const ang=Math.PI/180*(60*i-30);a.push({x:x+s*Math.cos(ang),y:y+s*Math.sin(ang)})}return a;}
function buildTopology(rows){
 const cells=axialForRows(rows), map=new Map(cells.map(c=>[`${c.q},${c.r}`,c]));
 const vertices=new Map(), edges=new Map(); const keyp=(x,y)=>`${Math.round(x*1000)/1000},${Math.round(y*1000)/1000}`;
 const s=1, dx=Math.sqrt(3)*s, dy=1.5*s;
 cells.forEach(c=>{const x=c.q*dx,y=c.r*dy; c.cx=x;c.cy=y;c.neighbors=[];const cs=hexCorners(x,y,s);c.vertexIds=[];for(const p of cs){const k=keyp(p.x,p.y);if(!vertices.has(k))vertices.set(k,{id:vertices.size,x:p.x,y:p.y,adj:[],hexes:[]});const v=vertices.get(k);v.hexes.push(c.id);c.vertexIds.push(v.id)}for(let i=0;i<6;i++){const a=c.vertexIds[i],b=c.vertexIds[(i+1)%6],k=a<b?`${a}-${b}`:`${b}-${a}`;if(!edges.has(k))edges.set(k,{id:edges.size,a,b,hexes:[]});edges.get(k).hexes.push(c.id)}});
 const verts=[...vertices.values()]; const ed=[...edges.values()];
 ed.forEach(e=>{verts[e.a].adj.push(e.b);verts[e.b].adj.push(e.a)});
 const dirs=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]]; cells.forEach(c=>dirs.forEach(([dq,dr])=>{const n=map.get(`${c.q+dq},${c.r+dr}`);if(n&&!c.neighbors.includes(n.id))c.neighbors.push(n.id)}));
 return {cells,vertices:verts,edges:ed};
}
function resourceDistribution(n){const count=n<=4?19:n<=6?30:37;const sets=count===19?[4,3,4,4,3]:count===30?[6,5,6,6,7]:[8,7,8,7,7];const base=[];RES.forEach((r,i)=>{for(let k=0;k<sets[i];k++)base.push(r)});return shuffle(base);}
function numbersFor(count){
 const nums=[2,3,3,4,4,5,5,6,6,8,8,9,9,10,10,11,11,12];
 while(nums.length<count)nums.push(...[3,4,5,6,8,9,10,11]);
 return shuffle(nums).slice(0,count);
}
function createBoard(n){
 const topo=buildTopology(layoutFor(n)); const terrains=resourceDistribution(n); const ns=numbersFor(terrains.length); let desert=Math.floor(Math.random()*terrains.length); const cells=topo.cells;
 cells.forEach((c,i)=>{c.terrain=terrains[i];c.number=null;c.robber=false}); cells[desert].terrain='desierto';
 let ni=0; for(const c of cells)if(c.terrain!=='desierto'){c.number=ns[ni++];}
 // Avoid adjacent 6/8 where possible with a few random retries.
 for(let tries=0;tries<80;tries++){
  const bad=cells.some(c=>[6,8].includes(c.number)&&c.neighbors.some(id=>[6,8].includes(cells[id].number)));
  if(!bad)break;
  const a=shuffle(cells.filter(c=>c.terrain!=='desierto'))[0],b=shuffle(cells.filter(c=>c.terrain!=='desierto'&&c.id!==a.id))[0]; [a.number,b.number]=[b.number,a.number];
 }
 // Ports on boundary vertices, shuffled. 5 resource-specific + 4 generic to give 9 trade spots on large boards; UI only uses reachable vertex.
 const boundary=topo.vertices.filter(v=>v.hexes.length<3).map(v=>v.id); const genericCount=n<=4?4:n<=6?6:8; const portTypes=shuffle(['croquetas','cerveza','chiva','vater','cruz',...Array(genericCount).fill('3:1')]);
 topo.vertices.forEach(v=>v.port=null); shuffle(boundary).slice(0,portTypes.length).forEach((vid,i)=>topo.vertices[vid].port=portTypes[i]);
 return {...topo,portTypes};
}
function bankFor(){return Object.fromEntries(RES.map(r=>[r,19]));}
function initRoom(){return {code:code(),phase:'lobby',players:{},sockets:new Map(),host:null,order:[],turn:null,rolled:false,board:null,bank:bankFor(),deck:shuffle(DEV_DECK),robber:null,log:[],winner:null,largestArmy:null,longestRoad:null,pendingTrade:null,placementIndex:0,placeRound:1,dice:null};}
function visiblePlayer(p){return {...p,connected:!!p.connected};}
function publicState(room,viewer){const players={};for(const [pid,p] of Object.entries(room.players)){const q={...p};if(pid!==viewer){q.res=emptyRes();q.resourceCount=totalRes(p);q.dev=[];q.devCount=p.dev.length;}players[pid]=q;}return {code:room.code,phase:room.phase,host:room.host,players,order:room.order,turn:room.turn,rolled:room.rolled,board:room.board,bank:room.bank,robber:room.robber,log:room.log.slice(-45),winner:room.winner,largestArmy:room.largestArmy,longestRoad:room.longestRoad,pendingTrade:room.pendingTrade&&([room.pendingTrade.from,room.pendingTrade.to].includes(viewer)?room.pendingTrade:null),pendingRobber:room.pendingRobber&&room.pendingRobber.fromKnight&&viewer===room.turn?room.pendingRobber:room.pendingRobber&&viewer===room.turn?room.pendingRobber:null,placementIndex:room.placementIndex,placeRound:room.placeRound,dice:room.dice};}
function send(room){for(const [pid,s] of room.sockets.entries())if(s.readyState===1)s.send(JSON.stringify({type:'state',state:publicState(room,pid)}));}
function err(ws,msg){if(ws.readyState===1)ws.send(JSON.stringify({type:'err',msg}));}
function log(room,msg){room.log.push(msg);if(room.log.length>120)room.log.shift();}
function give(room,p,r,n){if(n<=0)return 0;const take=Math.min(n,room.bank[r]);p.res[r]+=take;room.bank[r]-=take;return take;}
function charge(room,p,c){for(const [r,n] of Object.entries(c)){p.res[r]-=n;room.bank[r]+=n;}}
function canPay(p,c){return Object.entries(c).every(([r,n])=>(p.res[r]||0)>=n);}
function scoreRoad(room,p){const edges=new Set(p.roadsOn),adj=new Map();room.board.edges.forEach(e=>{if(edges.has(e.id)){if(!adj.has(e.a))adj.set(e.a,[]);if(!adj.has(e.b))adj.set(e.b,[]);adj.get(e.a).push(e);adj.get(e.b).push(e);}});let best=0;function dfs(v,used){let bestHere=used.size;const blocked=room.board.vertices[v].owner&&room.board.vertices[v].owner!==p.profile;if(blocked)return bestHere;for(const e of (adj.get(v)||[])){if(used.has(e.id))continue;used.add(e.id);const next=e.a===v?e.b:e.a;bestHere=Math.max(bestHere,dfs(next,used));used.delete(e.id);}return bestHere;}for(const v of adj.keys())best=Math.max(best,dfs(v,new Set()));return best;}
function updateAchievements(room){
 const arr=Object.entries(room.players).map(([id,p])=>({id,p,len:scoreRoad(room,p)})).filter(x=>x.p.connected);const max=arr.reduce((a,b)=>Math.max(a,b.len),0);const old=room.longestRoad;const oldLen=old&&room.players[old]?scoreRoad(room,room.players[old]):0;
 if(max>=5&&(!old||max>oldLen)){const candidate=arr.find(x=>x.len===max);if(old)room.players[old].vp=Math.max(0,room.players[old].vp-2);room.longestRoad=candidate.id;room.players[candidate.id].vp+=2;log(room,`${room.players[candidate.id].name} tiene el Camino más largo (+2)`);}else if(old&&!room.players[old].connected){room.players[old].vp=Math.max(0,room.players[old].vp-2);room.longestRoad=null;}
 const armies=Object.entries(room.players).map(([id,p])=>({id,n:p.knights})).filter(x=>room.players[x.id].connected);const ma=armies.reduce((a,b)=>Math.max(a,b.n),0);const oldA=room.largestArmy;const oldN=oldA&&room.players[oldA]?room.players[oldA].knights:0;
 if(ma>=3&&(!oldA||ma>oldN)){const candidate=armies.find(x=>x.n===ma);if(oldA)room.players[oldA].vp=Math.max(0,room.players[oldA].vp-2);room.largestArmy=candidate.id;room.players[candidate.id].vp+=2;log(room,`${room.players[candidate.id].name} tiene el Mayor ejército (+2)`);}else if(oldA&&!room.players[oldA].connected){room.players[oldA].vp=Math.max(0,room.players[oldA].vp-2);room.largestArmy=null;}
}
function checkWin(room,p){if(p.vp>=10&&room.phase==='playing'){room.phase='ended';room.winner=p.profile;log(room,`${p.name} ha ganado la partida`);}}
function nextTurn(room){const current=room.players[room.turn];if(current)current.devNew={};const idx=room.order.indexOf(room.turn); for(let i=1;i<=room.order.length;i++){const id=room.order[(idx+i)%room.order.length];if(room.players[id]?.connected){room.turn=id;break}}room.rolled=false;room.pendingTrade=null;room.dice=null;}
function adjacentOccupied(room,vid){return room.board.vertices[vid].adj.some(v=>room.board.vertices[v].owner);}
function roadConnects(room,p,eid,free=false){const e=room.board.edges[eid];if(!e)return false; if(p.roadsOn.includes(eid))return false; const ends=[e.a,e.b]; if(free)return true; for(const v of ends){const vv=room.board.vertices[v]; if(vv.owner===p.profile)return true; if(vv.owner&&vv.owner!==p.profile)continue; if(p.roadsOn.some(x=>{const re=room.board.edges[x];return re.a===v||re.b===v}))return true;}return false;}
function settlementLegal(room,p,vid,initial=false){const v=room.board.vertices[vid];if(!v||v.owner||adjacentOccupied(room,vid))return false;if(initial)return true;return v.adj.some(n=>room.board.vertices[n].owner===p.profile&&p.roadsOn.some(eid=>{const e=room.board.edges[eid];return e.a===n||e.b===n}));}
function portRatio(room,p,resource){let ratio=4;for(const vid of Object.keys(room.board.vertices)){const v=room.board.vertices[vid];if(v.owner===p.profile&&v.port){if(v.port===resource)ratio=2;else if(v.port==='3:1')ratio=Math.min(ratio,3)}}return ratio;}
function distribute(room,num){for(const c of room.board.cells){if(c.number!==num||c.id===room.robber||c.terrain==='desierto')continue;const demands=[];let total=0;for(const [pid,p] of Object.entries(room.players))if(p.connected){let n=0;for(const vid of p.settlementsOn)if(room.board.vertices[vid].hexes.includes(c.id))n++;for(const vid of p.citiesOn)if(room.board.vertices[vid].hexes.includes(c.id))n+=2;if(n){demands.push([p,n]);total+=n;}}if(total<=room.bank[c.terrain])for(const [p,n] of demands)give(room,p,c.terrain,n);}}
function steal(room,from,to){const choices=[];for(const r of RES)for(let i=0;i<from.res[r];i++)choices.push(r);if(!choices.length)return null;const r=choices[Math.floor(Math.random()*choices.length)];from.res[r]--;to.res[r]++;return r;}
function newGame(room){room.phase='placement1';room.order=shuffle(connectedPlayers(room).map(([id])=>id));room.turn=room.order[0];room.rolled=false;room.board=createBoard(room.order.length);room.bank=bankFor();room.deck=shuffle(DEV_DECK);room.robber=room.board.cells.find(c=>c.terrain==='desierto').id;room.log=[];room.winner=null;room.longestRoad=null;room.largestArmy=null;room.pendingTrade=null;room.placementIndex=0;room.placeRound=1;room.dice=null;room.placementDone=new Set();for(const p of Object.values(room.players)){p.res=emptyRes();p.dev=[];p.vp=0;p.roads=15;p.settlements=5;p.cities=4;p.knights=0;p.roadsOn=[];p.settlementsOn=[];p.citiesOn=[];p.devNew={};p.freeRoads=0;}log(room,'Partida iniciada: colocación inicial');}
function removeDisconnected(room){/* intentionally keep seats/pieces blocked during a live game */}

wss.on('connection',ws=>{let room=null,id=null;ws.on('message',raw=>{let m;try{m=JSON.parse(raw)}catch{return}
 if(m.type==='create'){room=initRoom();id=uid();const profile=PROFILES.includes(m.profile)?m.profile:PROFILES[0];const color=COLORS.includes(m.color)?m.color:COLORS[0];room.players[id]=makePlayer(profile,String(m.name||profile).slice(0,24),color,m.photo||'');room.host=id;room.sockets.set(id,ws);rooms.set(room.code,room);ws.send(JSON.stringify({type:'hello',id,code:room.code}));send(room);return;}
 if(m.type==='join'){const r=rooms.get(String(m.code||'').toUpperCase());if(!r)return err(ws,'No existe esa partida.');const prof=PROFILES.includes(m.profile)?m.profile:PROFILES[0];const existing=Object.entries(r.players).find(([,p])=>p.profile===prof);if(existing&&!existing[1].connected&&r.phase!=='ended'){id=existing[0];room=r;const p=r.players[id];p.connected=true;p.name=String(m.name||p.name||prof).slice(0,24);p.photo=String(m.photo ?? p.photo ?? '').slice(0,200000);if(COLORS.includes(m.color)&&!Object.values(r.players).some((q,qid)=>qid!==id&&q.connected&&q.color===m.color))p.color=m.color;room.sockets.set(id,ws);ws.send(JSON.stringify({type:'hello',id,code:room.code,reconnected:true}));log(room,`${p.name} se ha reconectado a la partida`);send(room);return;}if(r.phase!=='lobby')return err(ws,'La partida ya ha comenzado. Usa el mismo perfil y código para reconectarte.');if(connectedPlayers(r).length>=8)return err(ws,'La partida está llena.');if(existing&&existing[1].connected)return err(ws,'Ese perfil ya está ocupado.');if(Object.values(r.players).some(p=>p.color===m.color&&p.connected))return err(ws,'Ese color ya está ocupado.');room=r;id=uid();room.players[id]=makePlayer(prof,String(m.name||prof).slice(0,24),COLORS.includes(m.color)?m.color:COLORS[0],m.photo||'');room.sockets.set(id,ws);ws.send(JSON.stringify({type:'hello',id,code:room.code}));send(room);return;}
 if(!room||!id||!room.players[id])return; const p=room.players[id];
 if(m.type==='profile'||m.type==='profileUpdate'){
  const nextName=String(m.name??p.name).trim().slice(0,24)||p.name;
  const nextPhoto=String(m.photo??p.photo).slice(0,200000);
  const nextColor=COLORS.includes(m.color)?m.color:p.color;
  const colorBusy=Object.values(room.players).some(x=>x!==p&&x.connected&&x.color===nextColor);
  if(colorBusy)return err(ws,'Ese color ya está ocupado por otra jugadora.');
  p.name=nextName; p.photo=nextPhoto; p.color=nextColor;
  log(room,`${p.name} ha actualizado su perfil`);
  send(room); return;
}
 if(m.type==='start'){if(id!==room.host)return err(ws,'Solo la anfitriona puede empezar.');if(connectedPlayers(room).length<2)return err(ws,'Necesitáis al menos 2 jugadoras.');newGame(room);send(room);return;}
 if(m.type==='leave'){p.connected=false;room.sockets.delete(id);log(room,`${p.name} se ha desconectado; su perfil queda reservado para reconexión.`);if(room.host===id){const next=connectedPlayers(room)[0];if(next)room.host=next[0]}send(room);return;}
 if(room.phase==='lobby')return;
 if(room.phase==='ended')return;
 if((m.type==='placeSettlement'||m.type==='placeRoad')&&room.turn===id&&(room.phase==='placement1'||room.phase==='placement2')){
   const isSettlement=m.type==='placeSettlement',pos=Number(m.pos);
   if(isSettlement){if(p.settlements<=0||!settlementLegal(room,p,pos,true))return err(ws,'Ese punto no es válido.');room.board.vertices[pos].owner=p.profile;p.settlements--;p.settlementsOn.push(pos);p.vp++;updateAchievements(room);if(room.phase==='placement2'){for(const r of RES)give(room,p,r,1);}}
   else {const eid=Number(m.pos),e=room.board.edges[eid],lastSettlement=p.settlementsOn[p.settlementsOn.length-1];if(p.roads<=0||!e||!(e.a===lastSettlement||e.b===lastSettlement))return err(ws,'Tu camino inicial debe salir del pueblo que acabas de colocar.');p.roads--;p.roadsOn.push(eid);room.placementDone.add(id);
     const active=room.order.filter(x=>room.players[x]?.connected),remaining=active.filter(x=>!room.placementDone.has(x));
     if(remaining.length){const dir=room.placeRound===1?1:-1,idx=room.order.indexOf(id);let next=null;for(let step=1;step<=room.order.length;step++){const cand=room.order[(idx+dir*step+room.order.length*10)%room.order.length];if(remaining.includes(cand)){next=cand;break;}}room.turn=next;}
     else if(room.placeRound===1){room.placeRound=2;room.phase='placement2';room.placementDone=new Set();const rev=active.slice().reverse();room.turn=rev[0];}
     else {room.phase='playing';room.turn=active[0];room.rolled=false;log(room,'¡Comienza el juego!');}
   }
   send(room);return;
 }
if(room.phase!=='playing'||room.turn!==id)return;
 if(m.type==='roll'&&!room.rolled){const a=1+Math.floor(Math.random()*6),b=1+Math.floor(Math.random()*6),n=a+b;room.rolled=true;room.dice=[a,b];log(room,`${p.name} ha sacado un ${n}`);if(n===7){for(const q of Object.values(room.players)){if(q.connected&&totalRes(q)>7){const drop=Math.floor(totalRes(q)/2);const arr=[];for(const r of RES)for(let i=0;i<q.res[r];i++)arr.push(r);q.res=emptyRes();shuffle(arr).slice(0,drop).forEach(r=>q.res[r]++);}}
  room.pendingRobber={hex:null,target:null};log(room,'Ha salido 7: moved a Cristo y roba a una jugadora adyacente.');
 }else distribute(room,n);send(room);return;}
 if(m.type==='moveRobber'){if(!room.rolled||!room.pendingRobber)return;const hid=Number(m.hexId);if(!room.board.cells[hid]||hid===room.robber)return err(ws,'Elige otro hexágono.');room.robber=hid;room.pendingRobber.hex=hid;const adjacentProfiles=new Set();room.board.cells[hid].vertexIds.forEach(v=>{const owner=room.board.vertices[v].owner;if(owner&&owner!==p.profile)adjacentProfiles.add(owner)});if(!adjacentProfiles.size){delete room.pendingRobber;log(room,`${p.name} ha movido a Cristo.`);send(room);return;}room.pendingRobber.targets=[...adjacentProfiles].map(prof=>Object.entries(room.players).find(([,q])=>q.profile===prof)?.[0]).filter(Boolean);send(room);return;}
 if(m.type==='steal'){if(!room.pendingRobber||room.pendingRobber.hex===null)return;const target=room.players[m.target];if(!target||!room.pendingRobber.targets.includes(m.target))return err(ws,'Objetivo no válido.');const r=steal(room,target,p);delete room.pendingRobber;log(room,r?`${p.name} ha robado 1 recurso a ${target.name}`:`${p.name} no ha podido robar recursos`);send(room);return;}
 if(room.pendingRobber)return err(ws,'Primero termina la acción de Cristo.');
 if(m.type==='build'){const what=m.what;if(!COST[what])return err(ws,'Construcción no válida.');if(what!=='road'&& !canPay(p,COST[what]))return err(ws,'No tienes recursos suficientes.');if(what==='road'){const e=Number(m.pos);const free=(p.freeRoads||0)>0;if(p.roads<=0&& !free)return err(ws,'No te quedan caminos.');if(!roadConnects(room,p,e,false))return err(ws,'Ese camino no conecta con tu red.');if(!free)charge(room,p,COST.road);else p.freeRoads--;p.roads--;p.roadsOn.push(e);log(room,`${p.name} ha construido un camino${free?' gratis':''}`);}
 else if(what==='settlement'){const v=Number(m.pos);if(p.settlements<=0||!settlementLegal(room,p,v))return err(ws,'Ese pueblo no cumple las reglas de distancia/conexión.');charge(room,p,COST.settlement);room.board.vertices[v].owner=p.profile;p.settlements--;p.settlementsOn.push(v);p.vp++;log(room,`${p.name} ha construido un pueblo`);}
 else if(what==='city'){const v=Number(m.pos);if(p.cities<=0||!p.settlementsOn.includes(v))return err(ws,'Solo puedes mejorar uno de tus pueblos.');charge(room,p,COST.city);p.settlementsOn=p.settlementsOn.filter(x=>x!==v);p.citiesOn.push(v);p.cities--;p.settlements++;p.vp++;log(room,`${p.name} ha construido una ciudad`);}
 updateAchievements(room);checkWin(room,p);send(room);return;}
 if(m.type==='buyDev'){if(!room.deck.length)return err(ws,'No quedan cartas de desarrollo.');if(!canPay(p,COST.dev))return err(ws,'No tienes recursos suficientes.');charge(room,p,COST.dev);const bought=room.deck.pop();p.dev.push(bought);p.devNew[bought]=(p.devNew[bought]||0)+1;log(room,`${p.name} ha comprado una carta de desarrollo`);send(room);return;}
 if(m.type==='playDev'){const card=String(m.card),i=p.dev.indexOf(card);if(i<0)return err(ws,'No tienes esa carta.');if(card!=='punto'&&(p.devNew[card]||0)>0)return err(ws,'No puedes jugar una carta de desarrollo comprada este mismo turno.');if(p.dev[i]==='punto'){p.dev.splice(i,1);p.vp++;log(room,`${p.name} ha revelado un punto de victoria`);checkWin(room,p);send(room);return;} if(p.dev[i]==='caballero'){p.dev.splice(i,1);p.devNew[card]=Math.max(0,(p.devNew[card]||0)-1);p.knights++;updateAchievements(room);room.pendingRobber={hex:null,target:null,fromKnight:true};log(room,`${p.name} ha jugado El perseguidor`);send(room);return;}
 if(card==='monopolio'){const r=m.resource;if(!RES.includes(r))return err(ws,'Elige un recurso.');p.devNew[card]=Math.max(0,(p.devNew[card]||0)-1);p.dev.splice(i,1);let n=0;for(const q of Object.values(room.players))if(q!==p){n+=q.res[r];q.res[r]=0}p.res[r]+=n;log(room,`${p.name} ha jugado Aquí mando yo`);send(room);return;}
 if(card==='abundancia'){const a=m.r1,b=m.r2;if(!RES.includes(a)||!RES.includes(b)||a===b&&room.bank[a]<2||a!==b&&(room.bank[a]<1||room.bank[b]<1))return err(ws,'Recursos no disponibles.');p.devNew[card]=Math.max(0,(p.devNew[card]||0)-1);p.dev.splice(i,1);give(room,p,a,1);give(room,p,b,1);log(room,`${p.name} ha jugado Dos por el precio de ninguno`);send(room);return;}
 if(card==='construccion'){if(p.roads<2)return err(ws,'No tienes dos caminos disponibles.');p.devNew[card]=Math.max(0,(p.devNew[card]||0)-1);p.dev.splice(i,1);p.freeRoads=2;log(room,`${p.name} ha jugado Obra y gracia`);send(room);return;}}
 if(m.type==='tradeOffer'){if(pendingTradeExists(room))return err(ws,'Ya hay una propuesta abierta.');const to=room.players[m.to];const giveN=Math.max(1,Math.floor(Number(m.giveN)||0)),takeN=Math.max(1,Math.floor(Number(m.takeN)||0));if(!to||to===p||!to.connected)return err(ws,'Jugadora no válida.');if(!RES.includes(m.give)||!RES.includes(m.take)||p.res[m.give]<giveN)return err(ws,'No puedes ofrecer esos recursos.');room.pendingTrade={from:id,to:m.to,give:m.give,giveN,take:m.take,takeN};send(room);return;}
 if(m.type==='tradeRespond'){const t=room.pendingTrade;if(!t||t.to!==id)return;const from=room.players[t.from];if(m.accept&&from&&from.res[t.give]>=t.giveN&&p.res[t.take]>=t.takeN){from.res[t.give]-=t.giveN;p.res[t.give]+=t.giveN;p.res[t.take]-=t.takeN;from.res[t.take]+=t.takeN;log(room,`${from.name} ha intercambiado ${t.giveN} ${t.give} por ${t.takeN} ${t.take} con ${p.name}`);}room.pendingTrade=null;send(room);return;}
 if(m.type==='bankTrade'){const giveR=m.give,takeR=m.take;if(!RES.includes(giveR)||!RES.includes(takeR)||giveR===takeR)return;const ratio=portRatio(room,p,giveR);if(p.res[giveR]<ratio||room.bank[takeR]<1)return err(ws,`Necesitas ${ratio}:1 para ese recurso.`);p.res[giveR]-=ratio;room.bank[giveR]+=ratio;give(room,p,takeR,1);log(room,`${p.name} ha cambiado ${ratio} ${giveR} por 1 ${takeR}`);send(room);return;}
 if(m.type==='end'){checkWin(room,p);if(room.phase==='playing'){nextTurn(room);send(room);}return;}
 });
 ws.on('close',()=>{if(!room||!id||!room.players[id])return;room.players[id].connected=false;room.sockets.delete(id);if(room.host===id){const next=connectedPlayers(room)[0];if(next)room.host=next[0];}if(room.turn===id&&room.phase!=='lobby'&&room.phase!=='ended'){const idx=room.order.indexOf(id);for(let i=1;i<=room.order.length;i++){const nid=room.order[(idx+i)%room.order.length];if(room.players[nid]?.connected){room.turn=nid;room.rolled=false;room.pendingRobber=null;room.pendingTrade=null;break;}}}send(room);});
});
function pendingTradeExists(room){return !!room.pendingTrade}
const PORT=process.env.PORT||3000; server.listen(PORT,()=>console.log(`CATAN GG listo en http://localhost:${PORT}`));
