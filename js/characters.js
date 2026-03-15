// SKATEROOM — CHARACTER TEMPLATE ENGINE
// Each character = simple data object. Engine draws pixel art automatically.

const CHAR_PARTS = {
  hatStyles: {
    cap: (x,c,c2)=>`<rect x="${x+8}" y="1" width="16" height="5" fill="${c}"/><rect x="${x+6}" y="4" width="20" height="3" fill="${c}"/><rect x="${x+4}" y="5" width="6" height="2" fill="${c2||c}"/>`,
    capBack: (x,c)=>`<rect x="${x+8}" y="1" width="16" height="5" fill="${c}"/><rect x="${x+6}" y="4" width="20" height="3" fill="${c}"/><rect x="${x+22}" y="5" width="6" height="2" fill="${c}"/>`,
    beanie: (x,c)=>`<rect x="${x+8}" y="0" width="16" height="7" fill="${c}"/><rect x="${x+10}" y="0" width="12" height="2" fill="${c}"/>`,
    bandana: (x,c)=>`<rect x="${x+8}" y="2" width="16" height="4" fill="${c}"/><rect x="${x+6}" y="4" width="20" height="3" fill="${c}"/>`,
    durag: (x,c)=>`<rect x="${x+8}" y="1" width="16" height="5" fill="${c}"/><rect x="${x+6}" y="4" width="20" height="3" fill="${c}"/><rect x="${x+22}" y="6" width="4" height="6" fill="${c}" opacity=".6"/>`,
    afro: (x,c)=>`<rect x="${x+6}" y="0" width="20" height="8" fill="${c}"/><rect x="${x+4}" y="2" width="24" height="6" fill="${c}"/>`,
    kangol: (x,c)=>`<rect x="${x+6}" y="0" width="20" height="4" fill="${c}"/><rect x="${x+8}" y="3" width="16" height="5" fill="${c}"/><rect x="${x+4}" y="5" width="24" height="2" fill="${c}"/>`,
    crown: (x,c)=>`<rect x="${x+8}" y="0" width="16" height="2" fill="${c}"/><rect x="${x+8}" y="0" width="2" height="4" fill="${c}"/><rect x="${x+15}" y="0" width="2" height="4" fill="${c}"/><rect x="${x+22}" y="0" width="2" height="4" fill="${c}"/><rect x="${x+8}" y="2" width="16" height="4" fill="${c}"/>`,
    headphones: (x,c)=>`<path d="${x+8},4 Q${x+8},0 ${x+16},0 Q${x+24},0 ${x+24},4" fill="none" stroke="${c}" stroke-width="2"/><rect x="${x+6}" y="3" width="4" height="6" rx="2" fill="${c}"/><rect x="${x+22}" y="3" width="4" height="6" rx="2" fill="${c}"/>`,
    none: ()=>'',
    hair_long: (x,c)=>`<rect x="${x+6}" y="1" width="20" height="6" fill="${c}"/><rect x="${x+4}" y="4" width="4" height="12" fill="${c}"/><rect x="${x+24}" y="4" width="4" height="12" fill="${c}"/>`,
    hair_curly: (x,c)=>`<rect x="${x+6}" y="0" width="20" height="8" fill="${c}"/><rect x="${x+4}" y="2" width="4" height="14" fill="${c}"/><rect x="${x+24}" y="2" width="4" height="14" fill="${c}"/><rect x="${x+8}" y="0" width="4" height="2" fill="${c}"/><rect x="${x+20}" y="0" width="4" height="2" fill="${c}"/>`,
  },

  // Head with eyes and mouth
  head: (x,skin,eyes)=>`<rect x="${x+10}" y="5" width="12" height="11" fill="${skin}"/><rect x="${x+12}" y="9" width="2" height="2" fill="${eyes||'#111'}"/><rect x="${x+18}" y="9" width="2" height="2" fill="${eyes||'#111'}"/><rect x="${x+14}" y="13" width="4" height="1" fill="#111"/>`,

  shades: (x,c)=>`<rect x="${x+10}" y="8" width="12" height="4" fill="${c||'#111'}" rx="1"/><rect x="${x+11}" y="9" width="4" height="2" fill="${c||'#222'}" rx="1"/><rect x="${x+17}" y="9" width="4" height="2" fill="${c||'#222'}" rx="1"/>`,

  chain: (x,c)=>`<rect x="${x+12}" y="16" width="8" height="2" fill="${c||'#FFD700'}"/><rect x="${x+14}" y="18" width="4" height="3" fill="${c||'#FFD700'}"/>`,

  earrings: (x,c)=>`<rect x="${x+8}" y="10" width="2" height="2" fill="${c||'#FFD700'}"/><rect x="${x+22}" y="10" width="2" height="2" fill="${c||'#FFD700'}"/>`,

  body: (x,shirt,logo)=>{
    let s=`<rect x="${x+6}" y="16" width="20" height="14" fill="${shirt}"/>`;
    if(logo)s+=`<rect x="${x+10}" y="20" width="12" height="6" fill="${logo}"/>`;
    return s;
  },

  arms: (x,skin,shirt)=>`<rect x="${x+2}" y="18" width="4" height="10" fill="${shirt}"/><rect x="${x+26}" y="18" width="4" height="10" fill="${shirt}"/><rect x="${x+2}" y="28" width="4" height="2" fill="${skin}"/><rect x="${x+26}" y="28" width="4" height="2" fill="${skin}"/>`,

  pants: (x,c)=>`<rect x="${x+8}" y="30" width="7" height="11" fill="${c}"/><rect x="${x+17}" y="30" width="7" height="11" fill="${c}"/>`,

  shoes: (x,c)=>`<rect x="${x+6}" y="41" width="9" height="4" fill="${c}"/><rect x="${x+17}" y="41" width="9" height="4" fill="${c}"/>`,

  skirt: (x,c)=>`<rect x="${x+6}" y="30" width="20" height="8" fill="${c}"/><rect x="${x+8}" y="38" width="7" height="4" fill="${c}"/><rect x="${x+17}" y="38" width="7" height="4" fill="${c}"/>`,
};

function buildCharSVG(c, xOff=0){
  const P=CHAR_PARTS;
  const x=xOff;
  let svg='';
  // Hat
  const hatFn=P.hatStyles[c.hat]||P.hatStyles.none;
  svg+=hatFn(x,c.hatColor,c.hatColor2);
  // Head
  svg+=P.head(x,c.skin,c.eyeColor);
  // Shades
  if(c.shades)svg+=P.shades(x,c.shadesColor);
  // Earrings
  if(c.earrings)svg+=P.earrings(x,c.earringColor);
  // Chain
  if(c.chain)svg+=P.chain(x,c.chainColor);
  // Body
  svg+=P.body(x,c.shirt,c.logo);
  // Arms
  svg+=P.arms(x,c.skin,c.shirt);
  // Pants or skirt
  if(c.skirt)svg+=P.skirt(x,c.skirtColor);
  else svg+=P.pants(x,c.pants);
  // Shoes
  svg+=P.shoes(x,c.shoes);
  return svg;
}

function charToSVG(c){
  return `<svg viewBox="0 0 32 48" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">${buildCharSVG(c)}</svg>`;
}

// Walk animation: legs apart
function charToWalkSVG(c, frame){
  const P=CHAR_PARTS;
  let svg='';
  const hatFn=P.hatStyles[c.hat]||P.hatStyles.none;
  svg+=hatFn(0,c.hatColor,c.hatColor2);
  svg+=P.head(0,c.skin,c.eyeColor);
  if(c.shades)svg+=P.shades(0,c.shadesColor);
  if(c.earrings)svg+=P.earrings(0,c.earringColor);
  if(c.chain)svg+=P.chain(0,c.chainColor);
  svg+=P.body(0,c.shirt,c.logo);
  svg+=P.arms(0,c.skin,c.shirt);
  // Animated legs
  if(frame%2===0){
    svg+=`<rect x="8" y="30" width="7" height="11" fill="${c.pants}" transform="rotate(-10 12 30)"/>`;
    svg+=`<rect x="17" y="30" width="7" height="11" fill="${c.pants}" transform="rotate(10 20 30)"/>`;
  }else{
    svg+=`<rect x="8" y="30" width="7" height="11" fill="${c.pants}" transform="rotate(10 12 30)"/>`;
    svg+=`<rect x="17" y="30" width="7" height="11" fill="${c.pants}" transform="rotate(-10 20 30)"/>`;
  }
  svg+=P.shoes(0,c.shoes);
  return `<svg viewBox="0 0 32 48" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">${svg}</svg>`;
}

// ====== 35 CHARACTER DEFINITIONS ======
const CHAR_DEFS = [
  // --- LEGENDS ---
  {id:'2pac',name:'2Pac',style:'Thug Life',skin:'#8B6914',hat:'bandana',hatColor:'#CC2936',shades:false,chain:true,chainColor:'#FFD700',shirt:'#111',pants:'#2A3A5C',shoes:'#E8A317'},
  {id:'biggie',name:'Biggie',style:'King of NY',skin:'#5C3D2E',hat:'kangol',hatColor:'#111',shades:true,shadesColor:'#111',chain:true,shirt:'#6B2D8B',logo:'#E8A317',pants:'#222',shoes:'#fff'},
  {id:'eazy-e',name:'Eazy-E',style:'Compton OG',skin:'#6B4423',hat:'capBack',hatColor:'#111',shades:true,shadesColor:'#111',chain:true,shirt:'#fff',pants:'#333',shoes:'#111'},
  {id:'dre',name:'Dr. Dre',style:'The Chronic',skin:'#5C3D2E',hat:'none',shades:true,shadesColor:'#111',chain:true,shirt:'#111',logo:'#CC2936',pants:'#2A3A5C',shoes:'#fff'},
  {id:'ice-cube',name:'Ice Cube',style:'No Vaseline',skin:'#5C3D2E',hat:'cap',hatColor:'#2A3A5C',hatColor2:'#2A3A5C',shades:false,chain:true,shirt:'#2A3A5C',pants:'#333',shoes:'#111'},
  {id:'snoop',name:'Snoop',style:'Doggfather',skin:'#6B4423',hat:'bandana',hatColor:'#2A3A5C',shades:false,chain:true,chainColor:'#FFD700',shirt:'#2A3A5C',pants:'#222',shoes:'#fff'},
  {id:'nas',name:'Nas',style:'Illmatic',skin:'#8B6914',hat:'none',shades:false,chain:true,shirt:'#556B2F',pants:'#2A3A5C',shoes:'#E8A317'},
  {id:'wu-tang',name:'ODB',style:'Wu-Tang',skin:'#5C3D2E',hat:'beanie',hatColor:'#E8A317',shades:false,chain:true,chainColor:'#E8A317',shirt:'#111',logo:'#E8A317',pants:'#222',shoes:'#E8A317'},
  {id:'method',name:'Method Man',style:'Wu-Tang',skin:'#6B4423',hat:'bandana',hatColor:'#E8A317',shades:false,chain:true,chainColor:'#FFD700',shirt:'#111',pants:'#333',shoes:'#111'},
  {id:'dmx',name:'DMX',style:'Ruff Ryders',skin:'#5C3D2E',hat:'durag',hatColor:'#CC2936',shades:false,chain:true,shirt:'#CC2936',pants:'#111',shoes:'#CC2936'},

  // --- SKATERS ---
  {id:'muska',name:'Muska',style:"Shorty's",skin:'#DEBA9C',hat:'beanie',hatColor:'#111',shades:true,shadesColor:'#111',chain:false,shirt:'#111',logo:'#CC2936',pants:'#556B2F',shoes:'#fff'},
  {id:'koston',name:'Koston',style:'Girl Skate',skin:'#C8A07A',hat:'cap',hatColor:'#E8A317',hatColor2:'#E8A317',shades:false,chain:false,shirt:'#fff',logo:'#CC2936',pants:'#2A3A5C',shoes:'#CC2936'},
  {id:'mullen',name:'Mullen',style:'Tech King',skin:'#DEBA9C',hat:'none',shades:false,chain:false,shirt:'#CC2936',pants:'#333',shoes:'#fff'},
  {id:'hawk',name:'Tony Hawk',style:'900 Legend',skin:'#DEBA9C',hat:'none',shades:false,chain:false,shirt:'#CC2936',logo:'#fff',pants:'#2A3A5C',shoes:'#CC2936'},
  {id:'reynolds',name:'Reynolds',style:'Baker Boss',skin:'#DEBA9C',hat:'cap',hatColor:'#CC2936',hatColor2:'#111',shades:false,chain:false,shirt:'#111',logo:'#CC2936',pants:'#333',shoes:'#111'},
  {id:'penny',name:'Penny',style:'Flip Master',skin:'#8B6914',hat:'cap',hatColor:'#6B2D8B',hatColor2:'#6B2D8B',shades:false,chain:false,shirt:'#6B2D8B',pants:'#2A3A5C',shoes:'#fff'},
  {id:'gonz',name:'Gonz',style:'Art Legend',skin:'#DEBA9C',hat:'beanie',hatColor:'#E8A317',shades:false,chain:false,shirt:'#E8A317',logo:'#111',pants:'#556B2F',shoes:'#E8A317'},
  {id:'cardiel',name:'Cardiel',style:'Anti-Hero',skin:'#C8A07A',hat:'cap',hatColor:'#111',hatColor2:'#CC2936',shades:false,chain:false,shirt:'#CC2936',pants:'#111',shoes:'#CC2936'},

  // --- RAP GIRLS ---
  {id:'lauryn',name:'Lauryn Hill',style:'Fugees Queen',skin:'#6B4423',hat:'none',shades:false,chain:true,chainColor:'#FFD700',earrings:true,earringColor:'#FFD700',shirt:'#556B2F',pants:'#2A3A5C',shoes:'#E8A317'},
  {id:'missy',name:'Missy',style:'Supa Dupa',skin:'#5C3D2E',hat:'cap',hatColor:'#6B2D8B',hatColor2:'#6B2D8B',shades:true,shadesColor:'#6B2D8B',chain:true,shirt:'#6B2D8B',pants:'#111',shoes:'#6B2D8B'},
  {id:'lil-kim',name:'Lil Kim',style:'Queen Bee',skin:'#8B6914',hat:'hair_long',hatColor:'#E84393',shades:false,chain:true,chainColor:'#FFD700',earrings:true,earringColor:'#FFD700',shirt:'#E84393',logo:'#FFD700',pants:'#111',shoes:'#E84393'},
  {id:'aaliyah',name:'Aaliyah',style:'One In A Million',skin:'#8B6914',hat:'hair_long',hatColor:'#111',shades:true,shadesColor:'#111',chain:false,earrings:true,shirt:'#111',pants:'#2A3A5C',shoes:'#111'},
  {id:'foxy',name:'Foxy Brown',style:'Ill Na Na',skin:'#6B4423',hat:'hair_long',hatColor:'#1a0a08',shades:false,chain:true,chainColor:'#FFD700',earrings:true,earringColor:'#FFD700',shirt:'#CC2936',pants:'#111',shoes:'#CC2936'},
  {id:'eve',name:'Eve',style:'Ruff Ryders Girl',skin:'#8B6914',hat:'bandana',hatColor:'#E84393',shades:false,chain:true,earrings:true,shirt:'#111',pants:'#CC2936',shoes:'#111'},

  // --- BONDE ORIGINAL ---
  {id:'mc-red',name:'MC Red',style:'Rapper 90s',skin:'#8B6F4E',hat:'cap',hatColor:'#CC2936',hatColor2:'#CC2936',shades:false,chain:true,shirt:'#CC2936',pants:'#222',shoes:'#FFD700'},
  {id:'sk8-girl',name:'SK8 Girl',style:'Skatista Punk',skin:'#D4A574',hat:'hair_long',hatColor:'#E84393',shades:false,chain:false,shirt:'#111',pants:'#556B2F',shoes:'#CC2936'},
  {id:'dj-gold',name:'DJ Gold',style:'Produtor',skin:'#6B4423',hat:'headphones',hatColor:'#FFD700',shades:true,shadesColor:'#111',chain:true,shirt:'#1a1a1a',pants:'#2A3A5C',shoes:'#fff'},
  {id:'thrasher',name:'Thrasher',style:'Skatista MC',skin:'#C8A882',hat:'cap',hatColor:'#333',hatColor2:'#333',shades:false,chain:false,shirt:'#556B2F',logo:'#CC2936',pants:'#444',shoes:'#CC2936'},
  {id:'b-boy',name:'B-Boy',style:'Breakdancer',skin:'#8B6F4E',hat:'beanie',hatColor:'#6B2D8B',shades:false,chain:false,shirt:'#6B2D8B',logo:'#E8A317',pants:'#CC2936',shoes:'#fff'},
  {id:'ollie',name:'Ollie King',style:'Street Skater',skin:'#DEBA9C',hat:'cap',hatColor:'#E8A317',hatColor2:'#E8A317',shades:false,chain:false,shirt:'#fff',logo:'#CC2936',pants:'#2A3A5C',shoes:'#E8A317'},
  {id:'spray',name:'Spray',style:'Graffiti Writer',skin:'#C8A882',hat:'capBack',hatColor:'#CC2936',shades:false,chain:false,shirt:'#556B2F',pants:'#222',shoes:'#556B2F'},
  {id:'beatbox',name:'BeatBox',style:'Human Beatbox',skin:'#6B4423',hat:'cap',hatColor:'#CC2936',hatColor2:'#CC2936',shades:false,chain:false,shirt:'#E8A317',logo:'#CC2936',pants:'#111',shoes:'#E8A317'},
  {id:'blaze',name:'Blaze',style:'Freestyle MC',skin:'#6B4423',hat:'cap',hatColor:'#CC2936',hatColor2:'#CC2936',shades:false,chain:false,shirt:'#E8A317',pants:'#CC2936',shoes:'#111'},

  // ====== NISTIE & SINAMOTTA — Matching outfits, DESTAQUE ======
  {id:'nistie',name:'Nistie',style:'Muito Gangster',skin:'#8B6F4E',hat:'cap',hatColor:'#333',hatColor2:'#CC2936',shades:true,shadesColor:'#111',chain:true,chainColor:'#C0C0C0',shirt:'#777',logo:'#C0C0C0',pants:'#2A3A5C',shoes:'#111',highlight:true},
  {id:'sinamotta',name:'Sinamotta',style:'Princesa',skin:'#D4A574',hat:'hair_curly',hatColor:'#1a0a08',shades:false,chain:true,chainColor:'#FFD700',earrings:true,earringColor:'#FFD700',shirt:'#111',logo:'#FFD700',pants:'#2A3A5C',shoes:'#fff',highlight:true},
];

// Build the CHARACTERS array that app.js expects
const CHARACTERS = CHAR_DEFS.map(c=>{
  const svg = charToSVG(c);
  const danceSvg = charToWalkSVG(c, 0);
  return { id:c.id, name:c.name, style:c.style, svg, danceSvg, walkFrames:[charToWalkSVG(c,0),charToWalkSVG(c,1)], highlight:c.highlight };
});