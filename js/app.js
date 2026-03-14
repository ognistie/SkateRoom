// ========================================
// SKATESOUND v3.2 — YOUTUBE TELÃO
// Vídeos de skate 90s no telão da crew room
// ========================================

let selectedCharacter=null,isPlaying=false,vizInterval=null,currentRoomCode=null,socket=null;
let ytPlayer=null,playerReady=false;

const BACKEND_URL=window.location.origin;

// ====== INIT ======
window.addEventListener('load',()=>{
  const f=document.getElementById('loaderFill');let p=0;
  const iv=setInterval(()=>{p+=Math.random()*20+5;if(p>=100){p=100;clearInterval(iv);setTimeout(()=>document.getElementById('loader').classList.add('hidden'),400)}f.style.width=p+'%'},130);
  renderCharacters();
  loadSocketIO();
});

// ====== YOUTUBE PLAYER ======
function initYouTube(){
  const tag=document.createElement('script');
  tag.src='https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
}

window.onYouTubeIframeAPIReady=function(){
  ytPlayer=new YT.Player('ytPlayer',{
    width:'100%',height:'100%',
    playerVars:{
      listType:'playlist',
      list:DEFAULT_PLAYLIST_ID,
      autoplay:0,
      controls:1,
      modestbranding:1,
      rel:0,
      showinfo:0,
      iv_load_policy:3,
      loop:1,
      origin:window.location.origin
    },
    events:{
      onReady:function(e){
        playerReady=true;
        addSystemMsg('Telão pronto! Aperte PLAY 🎬');
      },
      onStateChange:function(e){
        if(e.data===YT.PlayerState.PLAYING){
          isPlaying=true;updatePlayState();startBoomboxViz();
          try{
            const vi=ytPlayer.getVideoData();
            if(vi&&vi.title){setText('trackNameDisplay',vi.title);setText('artistDisplay','YouTube')}
          }catch(ex){}
        }else if(e.data===YT.PlayerState.PAUSED){
          isPlaying=false;updatePlayState();
        }
      },
      onError:function(e){
        addSystemMsg('⚠ Vídeo indisponível — próximo...');
        setTimeout(()=>{try{ytPlayer.nextVideo()}catch(ex){}},1500);
      }
    }
  });
};

// ====== SOCKET.IO ======
function loadSocketIO(){
  const s=document.createElement('script');
  s.src=BACKEND_URL+'/socket.io/socket.io.js';
  s.onload=()=>{
    socket=io(BACKEND_URL,{transports:['websocket','polling']});
    socket.on('connect',()=>addSystemMsg('Conectado ao servidor!'));
    socket.on('disconnect',()=>addSystemMsg('Desconectado...'));
    socket.on('room-update',data=>updateUserList(data.users));
    socket.on('sync-play',data=>{if(ytPlayer&&playerReady){try{ytPlayer.playVideo()}catch(e){}}});
    socket.on('sync-pause',()=>{if(ytPlayer&&playerReady){try{ytPlayer.pauseVideo()}catch(e){}}});
    socket.on('chat-message',msg=>{if(msg.system)addSystemMsg(msg.message);else addChatMsg(msg.username,msg.message)});
  };
  s.onerror=()=>addSystemMsg('Servidor offline — modo local');
  document.head.appendChild(s);
}

function updateUserList(users){
  const g=document.getElementById('crewCharacters');
  if(g){
    const P=[{x:60,y:280},{x:135,y:280},{x:210,y:280},{x:700,y:295},{x:770,y:295},{x:500,y:350},{x:400,y:360},{x:600,y:350}];
    g.innerHTML='';
    users.forEach((u,i)=>{
      const pos=P[i%P.length];
      const ch=CHARACTERS.find(c=>c.id===u.character)||CHARACTERS[0];
      const svg=(ch.danceSvg||ch.svg).replace(/<\/?svg[^>]*>/g,'');
      const el=document.createElementNS('http://www.w3.org/2000/svg','g');
      el.setAttribute('transform','translate('+pos.x+','+pos.y+') scale(1.8)');
      el.innerHTML=svg;
      const lbl=document.createElementNS('http://www.w3.org/2000/svg','text');
      lbl.setAttribute('x','16');lbl.setAttribute('y','-5');lbl.setAttribute('fill','#E8A317');
      lbl.setAttribute('font-family',"'Press Start 2P',cursive");lbl.setAttribute('font-size','4');
      lbl.setAttribute('text-anchor','middle');lbl.textContent=u.username;
      el.appendChild(lbl);g.appendChild(el);
    });
  }
  const c=document.getElementById('userCount');if(c)c.textContent=users.length;
}

// ====== PAGES ======
function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const t=document.getElementById('page-'+id);
  if(t){t.classList.add('active');requestAnimationFrame(()=>{t.style.opacity='1'})}
  document.querySelectorAll('.nav-links a').forEach(a=>a.classList.toggle('active',a.dataset.page===id));
  document.getElementById('navLinks').classList.remove('open');
  window.scrollTo({top:0,behavior:'smooth'});
  if(id==='listen'){startBoomboxViz();renderPlaylist();if(!ytPlayer)initYouTube()}else{stopBoomboxViz()}
}

function renderPlaylist(){
  const el=document.getElementById('playlistContainer');if(!el)return;
  el.innerHTML=PLAYLIST.map((t,i)=>'<div class="pl-item" data-idx="'+i+'" onclick="playFromPlaylist('+i+')"><div class="pl-num">'+(i+1)+'</div><div class="pl-info"><div class="pl-name">'+t.name+'</div><div class="pl-artist">'+(t.artist||t.style)+'</div></div><div class="pl-style">'+t.style+'</div></div>').join('');
}

function playFromPlaylist(index){
  if(!ytPlayer||!playerReady)return;
  const t=PLAYLIST[index];
  try{ytPlayer.loadVideoById(t.ytId)}catch(e){}
  setText('trackNameDisplay',t.name);
  setText('artistDisplay',t.artist||t.style);
  document.querySelectorAll('.pl-item').forEach((el,i)=>el.classList.toggle('active',i===index));
  addSystemMsg('▶ '+t.name);
}
function toggleMenu(){document.getElementById('navLinks').classList.toggle('open')}

// ====== CHARACTERS ======
function renderCharacters(){
  const g=document.getElementById('charGrid');if(!g)return;
  g.innerHTML=CHARACTERS.map(c=>'<div class="char-card" data-id="'+c.id+'" onclick="selectCharacter(\''+c.id+'\')">'+c.svg+'<div class="char-name">'+c.name+'</div><div class="char-style">'+c.style+'</div></div>').join('');
}
function selectCharacter(id){selectedCharacter=CHARACTERS.find(c=>c.id===id);document.querySelectorAll('.char-card').forEach(card=>card.classList.toggle('selected',card.dataset.id===id))}

// ====== VISUALIZER ======
function startBoomboxViz(){if(vizInterval)return;const bars=document.querySelectorAll('.bb-bar');vizInterval=setInterval(()=>{if(!isPlaying)return;bars.forEach(b=>{const h=Math.random()*25+3;b.setAttribute('height',h);b.setAttribute('y',-h)})},100)}
function stopBoomboxViz(){if(vizInterval){clearInterval(vizInterval);vizInterval=null}}

// ====== ROOMS ======
function generateRoomCode(){const w=['GRIND','OLLIE','THRASHER','KICKFLIP','HALFPIPE','VERT','DECK'];return w[Math.floor(Math.random()*w.length)]+'-'+(Math.floor(Math.random()*9000)+1000)}
function joinServerRoom(code){
  currentRoomCode=code;setText('roomCode',code);setText('barRoomCode',code);
  if(socket&&socket.connected){socket.emit('join-room',{roomCode:code,character:selectedCharacter?selectedCharacter.id:'mc-red',username:selectedCharacter?selectedCharacter.name:'Player'})}
}
function createRoom(){joinServerRoom(generateRoomCode());showPage('listen')}
function joinRoom(){const input=document.getElementById('joinCodeInput');if(!input||!input.value.trim())return;joinServerRoom(input.value.trim().toUpperCase());showPage('listen')}

// ====== PLAYER CONTROLS ======
function playTrack(){
  if(!ytPlayer||!playerReady)return;
  try{
    const state=ytPlayer.getPlayerState();
    if(state===YT.PlayerState.PLAYING){ytPlayer.pauseVideo();if(socket&&currentRoomCode)socket.emit('pause-track',{roomCode:currentRoomCode})}
    else{ytPlayer.playVideo();if(socket&&currentRoomCode)socket.emit('play-track',{roomCode:currentRoomCode})}
  }catch(e){console.log('Player error:',e)}
}
function nextTrack(){if(ytPlayer&&playerReady){try{ytPlayer.nextVideo()}catch(e){}}}
function prevTrack(){if(ytPlayer&&playerReady){try{ytPlayer.previousVideo()}catch(e){}}}
function menuAction(){showPage('home')}

// ====== CHAT ======
function addSystemMsg(text){const box=document.getElementById('chatMessages');if(!box)return;const d=document.createElement('div');d.className='chat-msg system';d.innerHTML='<div class="msg-user">SISTEMA</div><div class="msg-text">'+text+'</div>';box.appendChild(d);box.scrollTop=box.scrollHeight}
function addChatMsg(user,text){const box=document.getElementById('chatMessages');if(!box)return;const d=document.createElement('div');d.className='chat-msg';d.innerHTML='<div class="msg-user">'+user+'</div><div class="msg-text">'+text+'</div>';box.appendChild(d);box.scrollTop=box.scrollHeight}
function sendChat(){const i=document.getElementById('chatInput');if(!i||!i.value.trim())return;const name=selectedCharacter?selectedCharacter.name:'Player';if(socket&&socket.connected&&currentRoomCode){socket.emit('chat-message',{roomCode:currentRoomCode,message:i.value.trim(),username:name})}else{addChatMsg(name,i.value.trim())}i.value=''}
function handleChatKey(e){if(e.key==='Enter')sendChat()}

// ====== UTILS ======
function setText(id,t){const e=document.getElementById(id);if(e)e.textContent=t}
function updatePlayState(){const btn=document.getElementById('playBtn');if(btn){btn.textContent=isPlaying?'⏸':'▶'}}
function switchTab(tab){document.querySelectorAll('.panel-tab').forEach(t=>t.classList.toggle('active',t.textContent.toLowerCase().includes(tab)));document.querySelectorAll('.panel-content').forEach(p=>p.classList.remove('active'));document.getElementById('tab-'+tab).classList.add('active')}

// ====== INIT ======
document.addEventListener('DOMContentLoaded',()=>{const code=generateRoomCode();setText('roomCode',code);setText('barRoomCode',code)});
document.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;if(e.code==='Space'){e.preventDefault();playTrack()}if(e.code==='ArrowRight')nextTrack();if(e.code==='ArrowLeft')prevTrack()});
const obs=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.style.opacity='1';e.target.style.transform='translateY(0) translateX(0)'}})},{threshold:0.1});
setTimeout(()=>{document.querySelectorAll('.news-card,.feature-card,.tech-item').forEach((c,i)=>{c.style.opacity='0';c.style.transform='translateY(20px)';c.style.transition='all .5s ease-out '+(i*.06)+'s';obs.observe(c)})},600);