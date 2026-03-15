// ========================================
// SKATEROOM v6.0 — FIXED: No loops, proper layout
// ========================================
let selectedCharacter=null,isPlaying=false,currentRoomCode=null,socket=null;
let ytPlayer=null,playerReady=false;
let isSyncing=false; // PREVENTS infinite loop
const BACKEND_URL=window.location.origin;

window.addEventListener('load',()=>{
  const f=document.getElementById('loaderFill');let p=0;
  const iv=setInterval(()=>{p+=Math.random()*20+5;if(p>=100){p=100;clearInterval(iv);setTimeout(()=>document.getElementById('loader').classList.add('hidden'),400)}f.style.width=p+'%'},130);
  renderCharacters();loadSocketIO();
});

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
        if(isSyncing)return; // BLOCK re-emit during sync
        if(e.data===YT.PlayerState.PLAYING){
          isPlaying=true;updatePlayState();
          try{const vi=ytPlayer.getVideoData();if(vi&&vi.title){setText('trackNameDisplay',vi.title);setText('artistDisplay','YouTube')}}catch(ex){}
          // Only emit if USER initiated (not sync)
          if(socket&&currentRoomCode&&!isSyncing){
            try{
              const vi=ytPlayer.getVideoData();
              socket.emit('video-state',{roomCode:currentRoomCode,videoId:vi.video_id,position:ytPlayer.getCurrentTime(),playing:true,name:vi.title||''});
            }catch(ex){}
          }
        }else if(e.data===YT.PlayerState.PAUSED){
          isPlaying=false;updatePlayState();
          if(socket&&currentRoomCode&&!isSyncing){
            socket.emit('video-state',{roomCode:currentRoomCode,playing:false,position:ytPlayer.getCurrentTime()});
          }
        }
      },
      onError:function(){addSystemMsg('⚠ Vídeo indisponível — próximo...');setTimeout(()=>{try{ytPlayer.nextVideo()}catch(ex){}},1500)}
    }
  });
};

function loadSocketIO(){
  const s=document.createElement('script');
  s.src=BACKEND_URL+'/socket.io/socket.io.js';
  s.onload=()=>{
    socket=io(BACKEND_URL,{transports:['websocket','polling']});
    socket.on('connect',()=>addSystemMsg('Conectado ao servidor!'));
    socket.on('disconnect',()=>addSystemMsg('Desconectado...'));
    socket.on('room-update',data=>{
      updateUserList(data.users);
      // Sync on join
      if(data.videoId&&ytPlayer&&playerReady){
        isSyncing=true;
        try{
          const cur=ytPlayer.getVideoData();
          if(!cur||cur.video_id!==data.videoId){
            ytPlayer.loadVideoById({videoId:data.videoId,startSeconds:data.position||0});
          }else if(data.isPlaying){
            ytPlayer.seekTo(data.position||0,true);ytPlayer.playVideo();
          }
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
          if(!cur||cur.video_id!==data.videoId){
            ytPlayer.loadVideoById({videoId:data.videoId,startSeconds:data.position||0});
          }else if(data.playing){
            ytPlayer.seekTo(data.position||0,true);ytPlayer.playVideo();
          }else{
            ytPlayer.pauseVideo();
          }
        }else if(!data.playing){
          ytPlayer.pauseVideo();
        }
        if(data.name){setText('trackNameDisplay',data.name);setText('artistDisplay','YouTube')}
      }catch(e){}
      setTimeout(()=>{isSyncing=false},2000);
    });
    socket.on('chat-message',msg=>{if(msg.system)addSystemMsg(msg.message);else addChatMsg(msg.username,msg.message)});
  };
  s.onerror=()=>addSystemMsg('Servidor offline — modo local');
  document.head.appendChild(s);
}

function updateUserList(users){
  const g=document.getElementById('crewCharacters');
  if(g){
    // Positions ON THE SOFA — sofa x=290 to x=710, sit at y=330
    const P=[
      {x:305,y:328},{x:355,y:328},{x:405,y:328},{x:455,y:328},{x:505,y:328},
      {x:555,y:328},{x:605,y:328},{x:655,y:328},
      {x:330,y:328},{x:430,y:328},{x:530,y:328},{x:630,y:328},
      {x:380,y:328},{x:480,y:328},{x:580,y:328}
    ];
    g.innerHTML='';
    users.forEach((u,i)=>{
      const pos=P[i%P.length];
      const ch=CHARACTERS.find(c=>c.id===u.character)||CHARACTERS[0];
      const svg=(ch.danceSvg||ch.svg).replace(/<\/?svg[^>]*>/g,'');
      const el=document.createElementNS('http://www.w3.org/2000/svg','g');
      el.setAttribute('transform','translate('+pos.x+','+pos.y+') scale(1.4)');
      el.innerHTML=svg;
      const lbl=document.createElementNS('http://www.w3.org/2000/svg','text');
      lbl.setAttribute('x','16');lbl.setAttribute('y','-4');lbl.setAttribute('fill','#E8A317');
      lbl.setAttribute('font-family',"'Bebas Neue',sans-serif");lbl.setAttribute('font-size','5');
      lbl.setAttribute('text-anchor','middle');lbl.textContent=u.username;
      el.appendChild(lbl);g.appendChild(el);
    });
  }
  const c=document.getElementById('userCount');if(c)c.textContent=users.length;
}

function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const t=document.getElementById('page-'+id);
  if(t){t.classList.add('active');requestAnimationFrame(()=>{t.style.opacity='1'})}
  document.querySelectorAll('.nav-links a').forEach(a=>a.classList.toggle('active',a.dataset.page===id));
  document.getElementById('navLinks').classList.remove('open');
  window.scrollTo({top:0,behavior:'smooth'});
  if(id==='listen'){renderPlaylist();if(!ytPlayer)initYouTube()}
}
function renderPlaylist(){
  const el=document.getElementById('playlistContainer');if(!el)return;
  el.innerHTML=PLAYLIST.map((t,i)=>'<div class="pl-item" data-idx="'+i+'" onclick="playFromPlaylist('+i+')"><div class="pl-num">'+(i+1)+'</div><div class="pl-info"><div class="pl-name">'+t.name+'</div><div class="pl-artist">'+(t.artist||t.style)+'</div></div><div class="pl-style">'+t.style+'</div></div>').join('');
}
function playFromPlaylist(index){
  if(!ytPlayer||!playerReady)return;
  const t=PLAYLIST[index];
  isSyncing=true;
  try{ytPlayer.loadVideoById(t.ytId)}catch(e){}
  setText('trackNameDisplay',t.name);setText('artistDisplay',t.artist||t.style);
  document.querySelectorAll('.pl-item').forEach((el,i)=>el.classList.toggle('active',i===index));
  if(socket&&currentRoomCode){
    socket.emit('video-state',{roomCode:currentRoomCode,videoId:t.ytId,position:0,playing:true,name:t.name});
  }
  setTimeout(()=>{isSyncing=false},2000);
}
function toggleMenu(){document.getElementById('navLinks').classList.toggle('open')}
function renderCharacters(){
  const g=document.getElementById('charGrid');if(!g)return;
  g.innerHTML=CHARACTERS.map(c=>'<div class="char-card" data-id="'+c.id+'" onclick="selectCharacter(\''+c.id+'\')">'+c.svg+'<div class="char-name">'+c.name+'</div><div class="char-style">'+c.style+'</div></div>').join('');
}
function selectCharacter(id){selectedCharacter=CHARACTERS.find(c=>c.id===id);document.querySelectorAll('.char-card').forEach(card=>card.classList.toggle('selected',card.dataset.id===id))}
function generateRoomCode(){const w=['GRIND','OLLIE','THRASHER','KICKFLIP','HALFPIPE','VERT','DECK','NOLLIE','HEELFLIP','DARKSLIDE'];return w[Math.floor(Math.random()*w.length)]+'-'+(Math.floor(Math.random()*9000)+1000)}
function joinServerRoom(code){
  currentRoomCode=code;setText('roomCode',code);setText('barRoomCode',code);
  if(socket&&socket.connected)socket.emit('join-room',{roomCode:code,character:selectedCharacter?selectedCharacter.id:'mc-red',username:selectedCharacter?selectedCharacter.name:'Player'});
}
function createRoom(){joinServerRoom(generateRoomCode());showPage('listen')}
function joinRoom(){const input=document.getElementById('joinCodeInput');if(!input||!input.value.trim())return;joinServerRoom(input.value.trim().toUpperCase());showPage('listen')}
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
const obs=new IntersectionObserver(en=>{en.forEach(e=>{if(e.isIntersecting){e.target.style.opacity='1';e.target.style.transform='translateY(0)'}})},{threshold:.1});
setTimeout(()=>{document.querySelectorAll('.news-card,.feature-card,.tech-item').forEach((c,i)=>{c.style.opacity='0';c.style.transform='translateY(20px)';c.style.transition='all .5s ease-out '+(i*.06)+'s';obs.observe(c)})},600);