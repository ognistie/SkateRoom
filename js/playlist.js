// ========================================
// SKATESOUND — YOUTUBE PLAYLISTS
// Vídeos de skate 90s passando no telão
// ========================================

// Playlists do YouTube (o player toca automaticamente os vídeos em sequência)
const YT_PLAYLISTS = [
  {name:"90s Skateboarding Classics",listId:"PL-BnylBbKmTnwdIo3QnB5k8jXS52yMJW3",style:"Skate VHS"},
  {name:"Old School Skate Videos",listId:"PL0D98A9F40608A283",style:"Old School"},
];

// Video IDs individuais de skate 90s como fallback
const PLAYLIST = [
  {name:"90s Skateboarding — VHS Classics",ytId:"d7PoeA4P6Is",style:"Skate VHS"},
  {name:"Old School Skate Compilation",ytId:"2IxP5Va9I5I",style:"Old School"},
  {name:"Blind Video Days (1991) Full",ytId:"gizM-PuVnY0",style:"Classic"},
  {name:"Plan B Questionable (1992)",ytId:"xA1ZU8lbsOk",style:"Street"},
  {name:"Girl Yeah Right! Clips",ytId:"oAmeKBaEBqE",style:"Tech"},
  {name:"Zoo York Mixtape (1997)",ytId:"5Hkl5xId51E",style:"NYC"},
  {name:"Toy Machine Welcome To Hell",ytId:"FxBXRfBGoSo",style:"Punk"},
  {name:"Dogtown and Z-Boys Trailer",ytId:"r2hUf4VLBsg",style:"Documentary"},
  {name:"Mid90s Official Trailer",ytId:"w9Rx6-GaSIE",style:"Movie"},
  {name:"Tony Hawk 900 — X Games 1999",ytId:"e4QGnppJ-ys",style:"Vert"},
];

// Qual playlist do YouTube carregar primeiro
const DEFAULT_PLAYLIST_ID = "PL-BnylBbKmTnwdIo3QnB5k8jXS52yMJW3";