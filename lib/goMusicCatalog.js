// Exact user-supplied MP3s and placements confirmed on 2026-11-03.
export const GO_MUSIC={
 album:{title:'Pallet Town / Lavender Town',file:'/audio/meonggo/BGM_Pokemon_Pallet_Town.mp3',playlist:['/audio/meonggo/BGM_Pokemon_Pallet_Town.mp3','/audio/meonggo/BGM_Pokemon_Lavender_Town.mp3'],available:true},
 discovery:{title:'Pallet Town',file:'/audio/meonggo/BGM_Pokemon_Pallet_Town.mp3',available:true},
 battle:{title:'8bit action boss battle',file:'/audio/meonggo/BGM_8bit_Action_Boss_Battle.mp3',available:true},
 camera:{title:'8bit action boss battle',file:'/audio/meonggo/BGM_8bit_Action_Boss_Battle.mp3',available:true}
};
export function goMusicFile(mode){const track=GO_MUSIC[mode];return track?.available?track.file:null;}
export function goMusicPlaylist(mode){const track=GO_MUSIC[mode];return track?.available?(track.playlist||[track.file]):[];}
