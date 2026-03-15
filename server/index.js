const path=require('path'),fs=require('fs'),express=require('express'),http=require('http'),{Server}=require('socket.io'),cors=require('cors');
const app=express();app.use(cors());app.use(express.json());app.use(express.static(path.join(__dirname,'../')));
const server=http.createServer(app);const io=new Server(server,{cors:{origin:'*'}});const rooms={};

// === COMMUNITY DATA — persisted to disk ===
const DATA_FILE=path.join(__dirname,'community.json');
let community={posts:[],nextId:1};

function loadCommunity(){
  try{if(fs.existsSync(DATA_FILE)){community=JSON.parse(fs.readFileSync(DATA_FILE,'utf8'));console.log('  Community loaded:',community.posts.length,'posts')}}
  catch(e){console.log('  New community file will be created')}
}
function saveCommunity(){
  try{fs.writeFileSync(DATA_FILE,JSON.stringify(community,null,2))}catch(e){console.error('Save error:',e)}
}
loadCommunity();

// REST API for community
app.get('/api/health',(q,r)=>r.json({status:'ok',rooms:Object.keys(rooms).length,posts:community.posts.length}));

app.get('/api/community',(q,r)=>{
  const tag=q.query.tag;
  let posts=[...community.posts];
  if(tag&&tag!=='all')posts=posts.filter(p=>p.tag===tag);
  r.json({posts:posts.sort((a,b)=>b.createdAt-a.createdAt),stats:getStats()});
});

app.post('/api/community/post',(q,r)=>{
  const{name,message,tag,avatar}=q.body;
  if(!message||!message.trim())return r.status(400).json({error:'Message required'});
  const post={id:community.nextId++,name:name||'Anônimo',message:message.trim(),tag:tag||'🛹 Geral',avatar:avatar||'#CC2936',likes:[],comments:[],createdAt:Date.now()};
  community.posts.push(post);saveCommunity();
  io.emit('community-new-post',post);
  r.json(post);
});

app.post('/api/community/post/:id/like',(q,r)=>{
  const post=community.posts.find(p=>p.id===parseInt(q.params.id));
  if(!post)return r.status(404).json({error:'Not found'});
  const uid=q.body.uid||'anon-'+Date.now();
  const idx=post.likes.indexOf(uid);
  if(idx>-1)post.likes.splice(idx,1);else post.likes.push(uid);
  saveCommunity();io.emit('community-update-post',post);
  r.json({likes:post.likes.length,liked:post.likes.includes(uid)});
});

app.post('/api/community/post/:id/comment',(q,r)=>{
  const post=community.posts.find(p=>p.id===parseInt(q.params.id));
  if(!post)return r.status(404).json({error:'Not found'});
  const{name,message,replyTo,avatar}=q.body;
  if(!message||!message.trim())return r.status(400).json({error:'Message required'});
  const comment={id:Date.now(),name:name||'Anônimo',message:message.trim(),replyTo:replyTo||null,avatar:avatar||'#E8A317',createdAt:Date.now()};
  post.comments.push(comment);saveCommunity();
  io.emit('community-update-post',post);
  r.json(comment);
});

app.delete('/api/community/post/:id',(q,r)=>{
  community.posts=community.posts.filter(p=>p.id!==parseInt(q.params.id));
  saveCommunity();r.json({ok:true});
});

// === ROOM SYNC ===
io.on('connection',socket=>{
  let currentRoom=null;
  socket.on('join-room',({roomCode,character,username})=>{
    if(currentRoom)leaveRoom(socket,currentRoom);
    socket.join(roomCode);currentRoom=roomCode;
    if(!rooms[roomCode])rooms[roomCode]={users:[],isPlaying:false,position:0,lastUpdate:Date.now(),videoId:null,videoName:''};
    const user={id:socket.id,character:character||'mc-red',username:username||'Player'};
    rooms[roomCode].users.push(user);
    let pos=rooms[roomCode].position||0;
    if(rooms[roomCode].isPlaying&&rooms[roomCode].lastUpdate)pos+=(Date.now()-rooms[roomCode].lastUpdate)/1000;
    io.to(roomCode).emit('room-update',{users:rooms[roomCode].users,isPlaying:rooms[roomCode].isPlaying,videoId:rooms[roomCode].videoId,position:pos});
    io.to(roomCode).emit('chat-message',{username:'SISTEMA',message:user.username+' entrou na sala! 🛹',system:true});
  });
  socket.on('video-state',({roomCode,videoId,position,playing,name})=>{
    if(!rooms[roomCode])return;
    if(videoId)rooms[roomCode].videoId=videoId;
    if(name)rooms[roomCode].videoName=name;
    rooms[roomCode].isPlaying=!!playing;rooms[roomCode].position=position||0;rooms[roomCode].lastUpdate=Date.now();
    socket.to(roomCode).emit('sync-video',{videoId:rooms[roomCode].videoId,position:position||0,playing:!!playing,name:rooms[roomCode].videoName});
    if(name&&playing)io.to(roomCode).emit('chat-message',{username:'SISTEMA',message:'▶️ '+name,system:true});
  });
  socket.on('chat-message',({roomCode,message,username})=>{
    if(!message||!message.trim())return;
    io.to(roomCode).emit('chat-message',{id:socket.id,username:username||'Player',message:message.trim(),system:false});
  });
  socket.on('disconnect',()=>{if(currentRoom)leaveRoom(socket,currentRoom)});
});

function leaveRoom(socket,roomCode){
  if(!rooms[roomCode])return;
  const user=rooms[roomCode].users.find(u=>u.id===socket.id);
  rooms[roomCode].users=rooms[roomCode].users.filter(u=>u.id!==socket.id);
  if(rooms[roomCode].users.length===0)delete rooms[roomCode];
  else{
    io.to(roomCode).emit('room-update',{users:rooms[roomCode].users,isPlaying:rooms[roomCode].isPlaying,videoId:rooms[roomCode].videoId,position:rooms[roomCode].position});
    if(user)io.to(roomCode).emit('chat-message',{username:'SISTEMA',message:user.username+' saiu 👋',system:true});
  }
  socket.leave(roomCode);
}

function getStats(){
  let likes=0,comments=0;
  community.posts.forEach(p=>{likes+=p.likes.length;comments+=p.comments.length});
  return{posts:community.posts.length,likes,comments};
}

const PORT=process.env.PORT||3001;
server.listen(PORT,'0.0.0.0',()=>console.log('\n🛹 SKATEROOM v7.0\n   http://localhost:'+PORT+'\n   Video sync ✅ | Community API ✅ | Data persistence ✅\n'));