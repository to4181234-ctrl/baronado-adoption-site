// Selected tracks from the supplied 2026-11-03 manifest. Actual BGM MP3s were absent.
// Set available only after the corresponding supplied file has been verified.
export const GO_MUSIC={
 album:{title:'Pallet Town',file:'/audio/meonggo/BGM_01_Pokemon_Pallet_Town.mp3',available:false},
 discovery:{title:'Wild Pokémon Battle',file:'/audio/meonggo/BGM_02_Pokemon_Wild_Pokemon_Battle.mp3',available:false},
 battle:{title:'Trainer Battle',file:'/audio/meonggo/BGM_03_Pokemon_Trainer_Battle.mp3',available:false},
 camera:{title:'Lavender Town',file:'/audio/meonggo/BGM_04_Pokemon_Lavender_Town.mp3',available:false,placementConfirmed:false}
};
export function goMusicFile(mode){const track=GO_MUSIC[mode];return track?.available?track.file:null;}
