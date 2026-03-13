let selectedCharacter=null,isPlaying=false,spotifyToken=null,spotifyPlayer=null,vizInterval=null,currentRoomCode=null,socket=null,refreshToken=null,deviceId=null;

// CONFIG — mude para a URL do seu servidor em produção
const BACKEND_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin;

const DEMO_TRACKS=[{name:'Juicy',artist:'The Notorious B.I.G.'},{name:'C.R.E.A.M.',artist:'Wu-Tang Clan'},{name:'California Love',artist:'2Pac ft. Dr. Dre'},{name:'Shook Ones Pt. II',artist:'Mobb Deep'},{name:"Nuthin' but a G Thang",artist:'Dr. Dre'},{name:'Sabotage',artist:'Beastie Boys'},{name:'Superman',artist:'Goldfinger'},{name:'Guerrilla Radio',artist:'RATM'},{name:"Gangsta's Paradise",artist:'Coolio'},{name:'N.Y. State of Mind',artist:'Nas'}];

// ====== INIT ======
window.addEventListener('load',()=>{
  const f=document.getElementById('loaderFill');let p=0;
  const iv=setInterval(()=>{p+=Math.random()*20+5;if(p>=100){p=100;clearInterval(iv);setTimeout(()=>document.getElementById('loader').classList.add('hidden'),400)}f.style.width=p+'%'},130);
  renderCharacters();
  checkSpotifyToken();
  loadSocketIO();
});

// ====== SOCKET.IO ======
function loadSocketIO(){
  const s=document.createElement('script');
  s.src=BACKEND_URL+'/socket.io/socket.io.js';
  s.onload=()=>{
    socket=io(BACKEND_URL,{transports:['websocket','polling']});
    socket.on('connect',()=>{console.log('🛹 Conectado ao server!');addSystemMsg('Conectado ao servidor!')});
    socket.on('disconnect',()=>{console.log('❌ Desconectado');addSystemMsg('Desconectado do servidor')});
    socket.on('room-update',(data)=>{
      console.log('Room update:',data.users.length,'users');
      updateUserList(data.users);
    });
    socket.on('sync-play',(data)=>{
      setText('ipodTrack',data.name);setText('ipodArtist',data.artist);
      setText('trackNameDisplay',data.name);setText('artistDisplay',data.artist);
      isPlaying=true;updatePlayState();
      if(spotifyPlayer&&data.trackUri){
        spotifyPlayUri(data.trackUri,data.position||0);
      }
    });
    socket.on('sync-pause',()=>{isPlaying=false;updatePlayState();if(spotifyPlayer)spotifyPlayer.pause()});
    socket.on('sync-seek',(data)=>{if(spotifyPlayer)spotifyPlayer.seek(data.position)});
    socket.on('chat-message',(msg)=>{
      if(msg.system)addSystemMsg(msg.message);
      else addChatMsg(msg.username,msg.message);
    });
  };
  s.onerror=()=>{console.warn('Socket.io não carregou — modo offline');addSystemMsg('Servidor offline — modo demo ativo')};
  document.head.appendChild(s);
}

function updateUserList(users){
  const el=document.getElementById('userCount');
  if(el)el.textContent=users.length+' no bar';
}

// ====== PAGES ======
function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const t=document.getElementById('page-'+id);
  if(t){t.classList.add('active');requestAnimationFrame(()=>{t.style.opacity='1'})}
  document.querySelectorAll('.nav-links a').forEach(a=>a.classList.toggle('active',a.dataset.page===id));
  document.getElementById('navLinks').classList.remove('open');
  window.scrollTo({top:0,behavior:'smooth'});
  if(id==='listen'){setupDancer();startBoomboxViz()}else{stopBoomboxViz()}
}
function toggleMenu(){document.getElementById('navLinks').classList.toggle('open')}

// ====== CHARACTERS ======
function renderCharacters(){
  const g=document.getElementById('charGrid');if(!g)return;
  g.innerHTML=CHARACTERS.map(c=>'<div class="char-card" data-id="'+c.id+'" onclick="selectCharacter(\''+c.id+'\')">'+c.svg+'<div class="char-name">'+c.name+'</div><div class="char-style">'+c.style+'</div></div>').join('');
}
function selectCharacter(id){selectedCharacter=CHARACTERS.find(c=>c.id===id);document.querySelectorAll('.char-card').forEach(card=>card.classList.toggle('selected',card.dataset.id===id))}
function setupDancer(){
  const el=document.getElementById('dancerChar');if(!el)return;
  const ch=selectedCharacter||CHARACTERS[0];el.innerHTML=ch.danceSvg||ch.svg;
  const svg=el.querySelector('svg');if(svg){svg.style.width='100px';svg.style.height='auto'}
  el.classList.toggle('paused',!isPlaying);
}

// ====== BOOMBOX VIZ ======
function startBoomboxViz(){if(vizInterval)return;const bars=document.querySelectorAll('.bb-bar');vizInterval=setInterval(()=>{if(!isPlaying)return;bars.forEach(b=>{const h=Math.random()*25+3;b.setAttribute('height',h);b.setAttribute('y',-h)})},100)}
function stopBoomboxViz(){if(vizInterval){clearInterval(vizInterval);vizInterval=null}}

// ====== ROOMS ======
function generateRoomCode(){const w=['GRIND','OLLIE','THRASHER','KICKFLIP','HEELFLIP','HALFPIPE','VERT','DECK'];return w[Math.floor(Math.random()*w.length)]+'-'+(Math.floor(Math.random()*9000)+1000)}

function joinServerRoom(code){
  currentRoomCode=code;
  setText('roomCode',code);setText('barRoomCode',code);
  if(socket&&socket.connected){
    socket.emit('join-room',{roomCode:code,character:selectedCharacter?selectedCharacter.id:'mc-red',username:selectedCharacter?selectedCharacter.name:'Player'});
  }
}

function createRoom(){
  const code=generateRoomCode();
  joinServerRoom(code);
  showPage('listen');
}
function joinRoom(){
  const input=document.getElementById('joinCodeInput');
  if(!input||!input.value.trim())return;
  joinServerRoom(input.value.trim().toUpperCase());
  showPage('listen');
}

// ====== CHAT ======
function addSystemMsg(text){const box=document.getElementById('chatMessages');if(!box)return;const d=document.createElement('div');d.className='chat-msg system';d.innerHTML='<div class="msg-user">SISTEMA</div><div class="msg-text">'+text+'</div>';box.appendChild(d);box.scrollTop=box.scrollHeight}
function addChatMsg(user,text){const box=document.getElementById('chatMessages');if(!box)return;const d=document.createElement('div');d.className='chat-msg';d.innerHTML='<div class="msg-user">'+user+'</div><div class="msg-text">'+text+'</div>';box.appendChild(d);box.scrollTop=box.scrollHeight}
function sendChat(){
  const i=document.getElementById('chatInput');if(!i||!i.value.trim())return;
  const name=selectedCharacter?selectedCharacter.name:'Player';
  if(socket&&socket.connected&&currentRoomCode){socket.emit('chat-message',{roomCode:currentRoomCode,message:i.value.trim(),username:name})}
  else{addChatMsg(name,i.value.trim())}
  i.value='';
}
function handleChatKey(e){if(e.key==='Enter')sendChat()}

// ====== SPOTIFY ======
function checkSpotifyToken(){
  const params=new URLSearchParams(window.location.search);
  const token=params.get('spotify_token');
  const refresh=params.get('refresh_token');
  if(token){
    spotifyToken=token;
    refreshToken=refresh;
    window.history.replaceState({},document.title,window.location.pathname);
    initSpotifyPlayer();
    const btn=document.getElementById('spotifyBtn');
    if(btn){btn.textContent='✅ SPOTIFY ON';btn.style.background='#1DB954'}
  }
}

function connectSpotify(){
  // Redireciona para o backend que faz o OAuth
  window.location.href=BACKEND_URL+'/auth/spotify';
}

function initSpotifyPlayer(){
  const s=document.createElement('script');s.src='https://sdk.scdn.co/spotify-player.js';document.body.appendChild(s);
  window.onSpotifyWebPlaybackSDKReady=()=>{
    spotifyPlayer=new Spotify.Player({name:'SkateSound',getOAuthToken:cb=>cb(spotifyToken),volume:0.8});
    spotifyPlayer.addListener('ready',({device_id:did})=>{
      deviceId=did;console.log('🎵 Spotify ready, device:',did);
      transferPlayback(did);
      addSystemMsg('Spotify conectado! Aperte PLAY 🎵');
    });
    spotifyPlayer.addListener('not_ready',()=>console.warn('Spotify device offline'));
    spotifyPlayer.addListener('player_state_changed',state=>{
      if(!state)return;
      const t=state.track_window.current_track;
      if(t){setText('ipodTrack',t.name);setText('ipodArtist',t.artists.map(a=>a.name).join(', '));setText('trackNameDisplay',t.name);setText('artistDisplay',t.artists.map(a=>a.name).join(', '))}
      isPlaying=!state.paused;updatePlayState();
    });
    spotifyPlayer.addListener('initialization_error',({message})=>console.error('Init error:',message));
    spotifyPlayer.addListener('authentication_error',({message})=>{console.error('Auth error:',message);tryRefreshToken()});
    spotifyPlayer.connect();
  };
}

async function transferPlayback(did){
  try{await fetch('https://api.spotify.com/v1/me/player',{method:'PUT',headers:{'Authorization':'Bearer '+spotifyToken,'Content-Type':'application/json'},body:JSON.stringify({device_ids:[did],play:false})})}catch(e){console.error('Transfer error:',e)}
}

async function spotifyPlayUri(uri,posMs){
  if(!deviceId||!spotifyToken)return;
  try{await fetch('https://api.spotify.com/v1/me/player/play?device_id='+deviceId,{method:'PUT',headers:{'Authorization':'Bearer '+spotifyToken,'Content-Type':'application/json'},body:JSON.stringify({uris:[uri],position_ms:posMs||0})})}catch(e){console.error('Play error:',e)}
}

async function tryRefreshToken(){
  if(!refreshToken)return;
  try{
    const res=await fetch(BACKEND_URL+'/auth/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:refreshToken})});
    const data=await res.json();
    if(data.access_token){spotifyToken=data.access_token;console.log('Token refreshed')}
  }catch(e){console.error('Refresh failed:',e)}
}

function setText(id,t){const e=document.getElementById(id);if(e)e.textContent=t}
function updatePlayState(){const d=document.getElementById('dancerChar'),v=document.getElementById('ipodViz');if(isPlaying){d?.classList.remove('paused');v?.classList.remove('paused')}else{d?.classList.add('paused');v?.classList.add('paused')}}

// ====== PLAYER CONTROLS ======
async function playTrack(){
  if(spotifyPlayer){
    await spotifyPlayer.togglePlay();
    // Broadcast para a sala
    if(socket&&currentRoomCode){
      const state=await spotifyPlayer.getCurrentState();
      if(state&&state.track_window.current_track){
        const t=state.track_window.current_track;
        if(!state.paused){
          socket.emit('play-track',{roomCode:currentRoomCode,trackUri:t.uri,position:state.position,name:t.name,artist:t.artists.map(a=>a.name).join(', ')});
        }else{
          socket.emit('pause-track',{roomCode:currentRoomCode});
        }
      }
    }
  }else{
    isPlaying=!isPlaying;if(isPlaying)showDemoTrack();updatePlayState();
  }
}
async function nextTrack(){
  if(spotifyPlayer){
    await spotifyPlayer.nextTrack();
    setTimeout(async()=>{
      const state=await spotifyPlayer.getCurrentState();
      if(state&&state.track_window.current_track&&socket&&currentRoomCode){
        const t=state.track_window.current_track;
        socket.emit('next-track',{roomCode:currentRoomCode,trackUri:t.uri,name:t.name,artist:t.artists.map(a=>a.name).join(', ')});
      }
    },500);
  }else{showDemoTrack()}
}
function prevTrack(){if(spotifyPlayer)spotifyPlayer.previousTrack()}
function menuAction(){showPage('home')}

function showDemoTrack(){
  const t=DEMO_TRACKS[Math.floor(Math.random()*DEMO_TRACKS.length)];
  setText('ipodTrack',t.name);setText('ipodArtist',t.artist);
  setText('trackNameDisplay',t.name);setText('artistDisplay',t.artist);
  isPlaying=true;updatePlayState();
  if(socket&&currentRoomCode){socket.emit('play-track',{roomCode:currentRoomCode,name:t.name,artist:t.artist})}
}

// ====== INIT ======
document.addEventListener('DOMContentLoaded',()=>{
  const code=generateRoomCode();
  setText('roomCode',code);setText('barRoomCode',code);
});

document.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;if(e.code==='Space'){e.preventDefault();playTrack()}if(e.code==='ArrowRight')nextTrack();if(e.code==='ArrowLeft')prevTrack()});

const obs=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.style.opacity='1';e.target.style.transform='translateY(0) translateX(0)'}})},{threshold:0.1,rootMargin:'0px 0px -40px 0px'});
setTimeout(()=>{document.querySelectorAll('.news-card').forEach(c=>{c.style.opacity='0';c.style.transform='translateX(-25px)';c.style.transition='all .5s ease-out';obs.observe(c)});document.querySelectorAll('.feature-card,.tech-item').forEach((c,i)=>{c.style.opacity='0';c.style.transform='translateY(25px)';c.style.transition='all .5s ease-out '+(i*.08)+'s';obs.observe(c)})},600);

console.log('%c🛹 SKATESOUND v2.1','color:#CC2936;font-size:20px;font-weight:bold');
console.log('%cRap 90s × Skate Culture\nby @ognistie','color:#E8A317;font-size:12px');