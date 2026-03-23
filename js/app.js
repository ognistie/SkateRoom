// ========================================
// SKATEROOM v8.0 — RPG Style + Game Room
// ========================================
let selectedCharacter=null,isPlaying=false,currentRoomCode=null,socket=null;
let ytPlayer=null,playerReady=false;
let isSyncing=false;
const BACKEND_URL=window.location.origin;

window.addEventListener('load',()=>{
  const f=document.getElementById('loaderFill');let p=0;
  const iv=setInterval(()=>{p+=Math.random()*20+5;if(p>=100){p=100;clearInterval(iv);setTimeout(()=>document.getElementById('loader').classList.add('hidden'),400)}f.style.width=p+'%'},130);
  renderCharacters();loadSocketIO();initHeroCanvas();
});

// ============ HERO CANVAS — Animated pixel scene ============
function initHeroCanvas(){
  const c=document.getElementById('heroCanvas');if(!c)return;
  const x=c.getContext('2d');
  let frame=0;
  const chars=[
    {cx:60,cy:75,skin:'#c8a070',hat:'#d04040',shirt:'#d04040',pants:'#2a3a5c',dir:1,speed:0.4},
    {cx:160,cy:80,skin:'#5c3d2e',hat:'#f0c040',shirt:'#111',pants:'#333',dir:-1,speed:0.3},
    {cx:280,cy:72,skin:'#e8c8a0',hat:'#8040c0',shirt:'#8040c0',pants:'#2a3a5c',dir:1,speed:0.5},
    {cx:350,cy:78,skin:'#8b6b40',hat:'#40a040',shirt:'#40a040',pants:'#222',dir:-1,speed:0.35},
  ];
  function drawHero(){
    x.clearRect(0,0,400,120);
    // Floor
    x.fillStyle='#3a2a1a';x.fillRect(0,90,400,30);
    x.fillStyle='#4a3828';for(let i=0;i<10;i++)x.fillRect(i*42,92,40,26);
    // Wall
    x.fillStyle='#2a1e14';x.fillRect(0,0,400,90);
    // Graffiti
    x.globalAlpha=0.15;x.font='bold 24px sans-serif';
    x.fillStyle='#d04040';x.fillText('SKATE',20,40);
    x.fillStyle='#f0c040';x.fillText('ROOM',140,60);
    x.fillStyle='#8040c0';x.fillText('BONDE',260,45);
    x.globalAlpha=1;
    // Characters
    frame++;
    chars.forEach(ch=>{
      ch.cx+=ch.dir*ch.speed;
      if(ch.cx>400)ch.cx=-20;if(ch.cx<-20)ch.cx=400;
      const legOff=Math.sin(frame*0.15)*2;
      // Shadow
      x.fillStyle='rgba(0,0,0,0.2)';
      x.beginPath();x.ellipse(ch.cx,ch.cy+16,6,2,0,0,Math.PI*2);x.fill();
      // Legs
      x.fillStyle=ch.pants;
      x.fillRect(ch.cx-4,ch.cy+6+legOff,3,7);x.fillRect(ch.cx+1,ch.cy+6-legOff,3,7);
      // Body
      x.fillStyle=ch.shirt;x.fillRect(ch.cx-5,ch.cy-2,10,9);
      // Head
      x.fillStyle=ch.skin;x.beginPath();x.arc(ch.cx,ch.cy-7,5,0,Math.PI*2);x.fill();
      // Hat
      x.fillStyle=ch.hat;x.fillRect(ch.cx-6,ch.cy-12,12,4);x.fillRect(ch.cx-4,ch.cy-14,8,3);
      // Eyes
      x.fillStyle='#111';x.fillRect(ch.cx-2,ch.cy-7,1.5,1.5);x.fillRect(ch.cx+1,ch.cy-7,1.5,1.5);
    });
    // Skateboard on floor
    x.fillStyle='#f0c040';
    x.beginPath();x.ellipse(200,100,18,3,0,0,Math.PI*2);x.fill();
    x.fillStyle='#555';x.beginPath();x.arc(190,104,2.5,0,Math.PI*2);x.fill();
    x.beginPath();x.arc(210,104,2.5,0,Math.PI*2);x.fill();
    requestAnimationFrame(drawHero);
  }
  drawHero();
}

// ============ YOUTUBE ============
function initYouTube(){
  if(document.getElementById('yt-api-script'))return;
  const tag=document.createElement('script');tag.id='yt-api-script';
  tag.src='https://www.youtube.com/iframe_api';document.head.appendChild(tag);
}
window.onYouTubeIframeAPIReady=function(){
  ytPlayer=new YT.Player('ytPlayer',{
    width:'100%',height:'100%',
    playerVars:{listType:'playlist',list:DEFAULT_PLAYLIST_ID,autoplay:0,controls:1,modestbranding:1,rel:0,showinfo:0,iv_load_policy:3,loop:1,origin:window.location.origin},
    events:{
      onReady:function(){playerReady=true;addSystemMsg('Telão pronto! Aperte PLAY 🎬')},
      onStateChange:function(e){
        if(isSyncing)return;
        if(e.data===YT.PlayerState.PLAYING){
          isPlaying=true;updatePlayState();
          try{const vi=ytPlayer.getVideoData();if(vi&&vi.title){setText('trackNameDisplay',vi.title);setText('artistDisplay','YouTube')}}catch(ex){}
          if(socket&&currentRoomCode&&!isSyncing){
            try{const vi=ytPlayer.getVideoData();socket.emit('video-state',{roomCode:currentRoomCode,videoId:vi.video_id,position:ytPlayer.getCurrentTime(),playing:true,name:vi.title||''})}catch(ex){}
          }
        }else if(e.data===YT.PlayerState.PAUSED){
          isPlaying=false;updatePlayState();
          if(socket&&currentRoomCode&&!isSyncing)socket.emit('video-state',{roomCode:currentRoomCode,playing:false,position:ytPlayer.getCurrentTime()});
        }
      },
      onError:function(){addSystemMsg('⚠ Vídeo indisponível');setTimeout(()=>{try{ytPlayer.nextVideo()}catch(ex){}},1500)}
    }
  });
};

// ============ SOCKET.IO ============
function loadSocketIO(){
  const s=document.createElement('script');
  s.src=BACKEND_URL+'/socket.io/socket.io.js';
  s.onload=()=>{
    socket=io(BACKEND_URL,{transports:['websocket','polling']});
    socket.on('connect',()=>addSystemMsg('Conectado ao servidor!'));
    socket.on('disconnect',()=>addSystemMsg('Desconectado...'));
    socket.on('room-update',data=>{
      updateUserList(data.users);
      if(data.videoId&&ytPlayer&&playerReady){
        isSyncing=true;
        try{
          const cur=ytPlayer.getVideoData();
          if(!cur||cur.video_id!==data.videoId)ytPlayer.loadVideoById({videoId:data.videoId,startSeconds:data.position||0});
          else if(data.isPlaying){ytPlayer.seekTo(data.position||0,true);ytPlayer.playVideo()}
        }catch(ex){}
        setTimeout(()=>{isSyncing=false},2000);
      }
    });
    socket.on('sync-video',data=>{
      if(!ytPlayer||!playerReady)return;
      isSyncing=true;
      try{
        if(data.videoId){
          const cur=ytPlayer.getVideoData();
          if(!cur||cur.video_id!==data.videoId)ytPlayer.loadVideoById({videoId:data.videoId,startSeconds:data.position||0});
          else if(data.playing){ytPlayer.seekTo(data.position||0,true);ytPlayer.playVideo()}
          else ytPlayer.pauseVideo();
        }else if(!data.playing)ytPlayer.pauseVideo();
        if(data.name){setText('trackNameDisplay',data.name);setText('artistDisplay','YouTube')}
      }catch(e){}
      setTimeout(()=>{isSyncing=false},2000);
    });
    socket.on('chat-message',msg=>{if(msg.system)addSystemMsg(msg.message);else addChatMsg(msg.username,msg.message)});
  };
  s.onerror=()=>addSystemMsg('Servidor offline — modo local');
  document.head.appendChild(s);
}

// ============ USER LIST (SVG room) ============
function updateUserList(users){
  const g=document.getElementById('crewCharacters');if(!g)return;
  const SOFA=[{x:255,y:310},{x:310,y:310},{x:365,y:310},{x:420,y:310},{x:475,y:310},{x:530,y:310},{x:585,y:310},{x:640,y:310},{x:695,y:310},{x:745,y:310}];
  const existing=new Set();
  g.querySelectorAll('[data-uid]').forEach(el=>existing.add(el.getAttribute('data-uid')));
  g.querySelectorAll('[data-uid]').forEach(el=>{if(!users.find(u=>u.id===el.getAttribute('data-uid')))el.remove()});
  users.forEach((u,i)=>{
    if(existing.has(u.id)){
      const el=g.querySelector('[data-uid="'+u.id+'"]');
      if(el){const pos=SOFA[i%SOFA.length];el.setAttribute('transform','translate('+pos.x+','+pos.y+') scale(1.4)')}
    }
  });
  const newUsers=users.filter(u=>!existing.has(u.id));
  newUsers.forEach(u=>{
    const idx=users.indexOf(u);const pos=SOFA[idx%SOFA.length];
    const ch=CHARACTERS.find(c=>c.id===u.character)||CHARACTERS[0];
    walkToSofa(g,u,ch,pos);
  });
  const c=document.getElementById('userCount');if(c)c.textContent=users.length;
}

function walkToSofa(container,user,char,target){
  const el=document.createElementNS('http://www.w3.org/2000/svg','g');
  el.setAttribute('data-uid',user.id);
  const startX=500,startY=480;let curX=startX,curY=startY,frame=0;
  el.setAttribute('transform','translate('+curX+','+curY+') scale(1.4)');
  const w0=(char.walkFrames&&char.walkFrames[0]||char.svg).replace(/<\/?svg[^>]*>/g,'');
  const w1=(char.walkFrames&&char.walkFrames[1]||char.danceSvg||char.svg).replace(/<\/?svg[^>]*>/g,'');
  const sit=(char.svg).replace(/<\/?svg[^>]*>/g,'');
  el.innerHTML=w0;
  const lbl=document.createElementNS('http://www.w3.org/2000/svg','text');
  lbl.setAttribute('x','16');lbl.setAttribute('y','-4');lbl.setAttribute('fill',char.highlight?'#FFD700':'#f0c040');
  lbl.setAttribute('font-family',"'Press Start 2P',monospace");lbl.setAttribute('font-size','4');
  lbl.setAttribute('text-anchor','middle');lbl.textContent=user.username;
  el.appendChild(lbl);container.appendChild(el);
  const dx=target.x-startX,dy=target.y-startY;let step=0;
  function animate(){
    step++;const t=Math.min(step/30,1);
    const ease=t<0.5?2*t*t:(1-Math.pow(-2*t+2,2)/2);
    curX=startX+dx*ease;curY=startY+dy*ease;
    el.setAttribute('transform','translate('+curX.toFixed(0)+','+curY.toFixed(0)+') scale(1.4)');
    frame++;const label=el.querySelector('text');
    el.innerHTML=frame%8<4?w0:w1;el.appendChild(label);
    if(t<1)requestAnimationFrame(animate);
    else{el.innerHTML=sit;el.appendChild(label);el.setAttribute('transform','translate('+target.x+','+target.y+') scale(1.4)')}
  }
  requestAnimationFrame(animate);
}

// ============ PAGE NAVIGATION ============
function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const t=document.getElementById('page-'+id);
  if(t){t.classList.add('active');requestAnimationFrame(()=>{t.style.opacity='1'})}
  document.querySelectorAll('.nav-links a').forEach(a=>a.classList.toggle('active',a.dataset.page===id));
  document.getElementById('navLinks').classList.remove('open');
  window.scrollTo({top:0,behavior:'smooth'});
  if(id==='listen'){renderPlaylist();if(!ytPlayer)initYouTube()}
}

// ============ CHARACTERS ============
function renderCharacters(){
  const g=document.getElementById('charGrid');if(!g)return;
  g.innerHTML=CHARACTERS.map(c=>'<div class="char-card'+(c.highlight?' highlight':'')+'" data-id="'+c.id+'" onclick="selectCharacter(\''+c.id+'\')">'+c.svg+'<div class="char-name">'+c.name+'</div><div class="char-style">'+c.style+'</div></div>').join('');
}

function selectCharacter(id){
  selectedCharacter=CHARACTERS.find(c=>c.id===id);
  document.querySelectorAll('.char-card').forEach(card=>card.classList.toggle('selected',card.dataset.id===id));
  // Update preview
  const preview=document.getElementById('selectedCharPreview');
  if(preview&&selectedCharacter){
    preview.style.display='flex';
    document.getElementById('previewSVG').innerHTML=selectedCharacter.svg;
    document.getElementById('previewName').textContent=selectedCharacter.name;
    document.getElementById('previewStyle').textContent=selectedCharacter.style;
  }
  // Hide join warning
  const warn=document.getElementById('joinWarning');
  if(warn)warn.style.display='none';
}

// ============ ROOM MANAGEMENT ============
function generateRoomCode(){const w=['GRIND','OLLIE','THRASHER','KICKFLIP','HALFPIPE','VERT','DECK','NOLLIE','HEELFLIP','DARKSLIDE'];return w[Math.floor(Math.random()*w.length)]+'-'+(Math.floor(Math.random()*9000)+1000)}

function joinServerRoom(code){
  currentRoomCode=code;setText('roomCode',code);setText('barRoomCode',code);
  if(socket&&socket.connected)socket.emit('join-room',{roomCode:code,character:selectedCharacter?selectedCharacter.id:'mc-red',username:selectedCharacter?selectedCharacter.name:'Player'});
}

function createRoom(){
  if(!selectedCharacter){
    const warn=document.getElementById('joinWarning');if(warn){warn.style.display='block';warn.classList.add('shake')}
    document.querySelector('.char-section')?.scrollIntoView({behavior:'smooth'});
    return;
  }
  joinServerRoom(generateRoomCode());showPage('listen');
}

function joinRoom(){
  if(!selectedCharacter){
    const warn=document.getElementById('joinWarning');if(warn){warn.style.display='block';warn.classList.add('shake')}
    document.querySelector('.char-section')?.scrollIntoView({behavior:'smooth'});
    return;
  }
  const input=document.getElementById('joinCodeInput');
  if(!input||!input.value.trim())return;
  joinServerRoom(input.value.trim().toUpperCase());showPage('listen');
}

// ============ PLAYLIST ============
function renderPlaylist(){
  const el=document.getElementById('playlistContainer');if(!el)return;
  el.innerHTML=PLAYLIST.map((t,i)=>'<div class="pl-item" data-idx="'+i+'" onclick="playFromPlaylist('+i+')"><div class="pl-num">'+(i+1)+'</div><div class="pl-info"><div class="pl-name">'+t.name+'</div><div class="pl-artist">'+(t.artist||t.style)+'</div></div><div class="pl-style">'+t.style+'</div></div>').join('');
}
function playFromPlaylist(index){
  if(!ytPlayer||!playerReady)return;
  const t=PLAYLIST[index];isSyncing=true;
  try{ytPlayer.loadVideoById(t.ytId)}catch(e){}
  setText('trackNameDisplay',t.name);setText('artistDisplay',t.artist||t.style);
  document.querySelectorAll('.pl-item').forEach((el,i)=>el.classList.toggle('active',i===index));
  if(socket&&currentRoomCode)socket.emit('video-state',{roomCode:currentRoomCode,videoId:t.ytId,position:0,playing:true,name:t.name});
  setTimeout(()=>{isSyncing=false},2000);
}

// ============ CHAT & UTILS ============
function toggleMenu(){document.getElementById('navLinks').classList.toggle('open')}
function playTrack(){if(!ytPlayer||!playerReady)return;try{const s=ytPlayer.getPlayerState();if(s===YT.PlayerState.PLAYING)ytPlayer.pauseVideo();else ytPlayer.playVideo()}catch(e){}}
function nextTrack(){if(ytPlayer&&playerReady)try{ytPlayer.nextVideo()}catch(e){}}
function prevTrack(){if(ytPlayer&&playerReady)try{ytPlayer.previousVideo()}catch(e){}}
function addSystemMsg(t){const b=document.getElementById('chatMessages');if(!b)return;const d=document.createElement('div');d.className='chat-msg system';d.innerHTML='<div class="msg-user">SISTEMA</div><div class="msg-text">'+t+'</div>';b.appendChild(d);b.scrollTop=b.scrollHeight}
function addChatMsg(u,t){const b=document.getElementById('chatMessages');if(!b)return;const d=document.createElement('div');d.className='chat-msg';d.innerHTML='<div class="msg-user">'+u+'</div><div class="msg-text">'+t+'</div>';b.appendChild(d);b.scrollTop=b.scrollHeight}
function sendChat(){const i=document.getElementById('chatInput');if(!i||!i.value.trim())return;const n=selectedCharacter?selectedCharacter.name:'Player';if(socket&&socket.connected&&currentRoomCode)socket.emit('chat-message',{roomCode:currentRoomCode,message:i.value.trim(),username:n});else addChatMsg(n,i.value.trim());i.value=''}
function handleChatKey(e){if(e.key==='Enter')sendChat()}
function setText(id,t){const e=document.getElementById(id);if(e)e.textContent=t}
function updatePlayState(){const b=document.getElementById('playBtn');if(b)b.textContent=isPlaying?'⏸':'▶'}
document.addEventListener('DOMContentLoaded',()=>{const c=generateRoomCode();setText('roomCode',c);setText('barRoomCode',c)});
document.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;if(e.code==='Space'){e.preventDefault();playTrack()}if(e.code==='ArrowRight')nextTrack();if(e.code==='ArrowLeft')prevTrack()});