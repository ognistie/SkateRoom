const path=require('path'),express=require('express'),http=require('http'),{Server}=require('socket.io'),cors=require('cors');
const app=express();app.use(cors());app.use(express.json());app.use(express.static(path.join(__dirname,'../')));
const server=http.createServer(app);const io=new Server(server,{cors:{origin:'*'}});const rooms={};
app.get('/api/health',(q,r)=>r.json({status:'ok',rooms:Object.keys(rooms).length}));

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

  // Single event for ALL video state changes — no echo back to sender
  socket.on('video-state',({roomCode,videoId,position,playing,name})=>{
    if(!rooms[roomCode])return;
    if(videoId)rooms[roomCode].videoId=videoId;
    if(name)rooms[roomCode].videoName=name;
    rooms[roomCode].isPlaying=!!playing;
    rooms[roomCode].position=position||0;
    rooms[roomCode].lastUpdate=Date.now();
    // ONLY send to OTHER users, never back to sender
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

const PORT=process.env.PORT||3001;
server.listen(PORT,'0.0.0.0',()=>console.log('\n🛹 SKATEROOM v6.0\n   http://localhost:'+PORT+'\n   Video sync (no loops) ✅\n'));