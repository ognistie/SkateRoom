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
  const main=document.querySelector('.room-main');if(!main)return;
  // Remove old char spots
  main.querySelectorAll('.char-spot').forEach(el=>{
    if(!users.find(u=>u.id===el.dataset.uid))el.remove();
  });
  // Seat positions as % of room-main (matches background-size:100% 100%)
  const SEATS=[
    // Sofa cushions (left area)
    {left:'7%',top:'75%',w:32,h:44},
    {left:'11%',top:'75%',w:32,h:44},
    {left:'15%',top:'75%',w:32,h:44},
    {left:'19%',top:'75%',w:32,h:44},
    {left:'23%',top:'75%',w:32,h:44},
    // Red chair
    {left:'30%',top:'76%',w:28,h:38},
    // Near mural
    {left:'52%',top:'80%',w:28,h:38},
    {left:'58%',top:'78%',w:28,h:38},
    // Near arcade
    {left:'78%',top:'74%',w:26,h:36},
    {left:'84%',top:'76%',w:26,h:36},
    // Floor
    {left:'26%',top:'82%',w:24,h:32},
    {left:'42%',top:'84%',w:24,h:32},
    {left:'66%',top:'82%',w:24,h:32},
    {left:'72%',top:'84%',w:24,h:32},
    // Near snack
    {left:'90%',top:'72%',w:24,h:32},
  ];
  function seatIdx(uid,i){let h=0;for(let c=0;c<uid.length;c++)h=((h<<5)-h)+uid.charCodeAt(c);return Math.abs(h+i)%SEATS.length}

  users.forEach((u,i)=>{
    let el=main.querySelector('.char-spot[data-uid="'+u.id+'"]');
    const seat=SEATS[seatIdx(u.id,i)];
    const ch=CHARACTERS.find(c=>c.id===u.character)||CHARACTERS[0];
    if(!el){
      el=document.createElement('div');
      el.className='char-spot';el.dataset.uid=u.id;
      el.innerHTML=ch.svg+'<div class="char-label">'+u.username+'</div>';
      el.style.opacity='0';
      main.appendChild(el);
      // Animate in
      setTimeout(()=>{el.style.opacity='1'},50);
    }
    el.style.left=seat.left;el.style.top=seat.top;
    el.style.width=seat.w+'px';el.style.height=seat.h+'px';
  });
  const c=document.getElementById('userCount');if(c)c.textContent=users.length;
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

// === ROOM INTERACTIVE FUNCTIONS ===
function snackInteraction(){
  const snacks=['🍕 Pizza!','🍔 Burger!','🌮 Taco!','🍟 Fries!','🥤 Soda!','🍩 Donut!','🍫 Chocolate!','☕ Coffee!'];
  addSystemMsg(snacks[Math.floor(Math.random()*snacks.length)]+' Pegou um lanche!');
}
function coinInteraction(){
  const msgs=['🪙 +100 Coins!','🪙 +50 Coins!','🪙 Jackpot! +500!','🪙 +25 Coins','🪙 +200 Coins!'];
  addSystemMsg(msgs[Math.floor(Math.random()*msgs.length)]);
}
function promptAddLink(){
  const url=prompt('Cole o link do vídeo do YouTube:');
  if(url)addSystemMsg('🔗 Link sugerido: '+url);
}
function copyRoomCode(){
  const code=document.getElementById('barRoomCode')?.textContent||'';
  if(code&&code!=='—'){navigator.clipboard?.writeText(code);addSystemMsg('📋 Código copiado: '+code)}
}
function toggleFullscreen(){
  if(!document.fullscreenElement)document.querySelector('.room-main')?.requestFullscreen?.();
  else document.exitFullscreen?.();
}
function updateRoomName(){
  const o=document.getElementById('roomNameOverlay');
  const c=document.getElementById('barRoomCode')?.textContent||'';
  if(o&&c&&c!=='—')o.textContent='🛹 '+c;
}
const _origJSR=joinServerRoom;
joinServerRoom=function(code){_origJSR(code);setTimeout(updateRoomName,200)};

// Character placement (new image)
const _origUUL=updateUserList;
updateUserList=function(users){
  const container=document.getElementById('charContainer');
  if(!container)return _origUUL(users);
  container.querySelectorAll('.char-spot').forEach(el=>{
    if(!users.find(u=>u.id===el.dataset.uid))el.remove();
  });
  // Seats — SVG viewBox 1200x600, as % of room-main
  const SEATS=[
    // Sofa: x=120-400, y=390 → left 10-33%, top 65%
    {left:'10%',top:'62%',w:28,h:38},
    {left:'14%',top:'62%',w:28,h:38},
    {left:'18%',top:'62%',w:28,h:38},
    {left:'22%',top:'62%',w:28,h:38},
    {left:'26%',top:'62%',w:28,h:38},
    // Red chair: x=440, y=405 → left 37%, top 67%
    {left:'36%',top:'65%',w:24,h:34},
    // Near mural
    {left:'50%',top:'72%',w:24,h:34},
    {left:'56%',top:'70%',w:24,h:34},
    // Near arcade
    {left:'82%',top:'62%',w:22,h:30},
    {left:'86%',top:'65%',w:22,h:30},
    // Floor
    {left:'30%',top:'75%',w:22,h:30},
    {left:'44%',top:'78%',w:22,h:30},
    {left:'64%',top:'76%',w:22,h:30},
    {left:'70%',top:'78%',w:22,h:30},
    {left:'90%',top:'58%',w:20,h:28},
  ];
  function sIdx(uid,i){let h=0;for(let c=0;c<uid.length;c++)h=((h<<5)-h)+uid.charCodeAt(c);return Math.abs(h+i)%SEATS.length}
  users.forEach((u,i)=>{
    let el=container.querySelector('.char-spot[data-uid="'+u.id+'"]');
    const seat=SEATS[sIdx(u.id,i)];
    const ch=CHARACTERS.find(c=>c.id===u.character)||CHARACTERS[0];
    if(!el){
      el=document.createElement('div');el.className='char-spot';el.dataset.uid=u.id;
      el.innerHTML=ch.svg+'<div class="char-label">'+u.username+'</div>';
      el.style.opacity='0';container.appendChild(el);
      setTimeout(()=>{el.style.opacity='1'},50);
    }
    el.style.left=seat.left;el.style.top=seat.top;
    el.style.width=seat.w+'px';el.style.height=seat.h+'px';
  });
  const c=document.getElementById('userCount');if(c)c.textContent=users.length;
};