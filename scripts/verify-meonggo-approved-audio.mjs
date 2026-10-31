// Verify the exact user-approved MP3 bytes before any merge or release.
import {createHash} from 'node:crypto';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';

const expected={
  "BGM_02_Album_Original_Chiptune_Loop.mp3": "f967b87eac0329c35cf13c67464616ae95de10d4251dc938b401743c82c6e803",
  "BGM_03_Camera_Original_Suspense_Loop.mp3": "7729a09f6bf0ac31b3e83f625110e66bd19d09b1d6252d4f04ff88b72f1d4428",
  "SFX_01_Card_Appear.mp3": "647531f8ee9119f271543edeb67e6f25dfe5b59991a7e3df6f1c477451eebf0d",
  "SFX_02_Card_Select.mp3": "65e6cbff8e3694251a37a5249bfb0352ef3894db77e1361f94d7586f51ce21dc",
  "SFX_03_Card_Deselect.mp3": "9de857b90b8568cf282781bc7a784d715fec189d664c4c7df5106a9dd0a8960d",
  "SFX_04_Two_Cards_Ready.mp3": "d5b2099edd8983df541b919c478ea82465ebb12629e3e64af1a8286a5057ed98",
  "SFX_05_Battle_Start.mp3": "6f20eeef3b08c9277dd8c1589314a52809a30a26e5676fff08ad717108b5e9d4",
  "SFX_06_Battle_Impact.mp3": "a460a3545c8dcd357a88bb94e1e92c563ebdede3474a9723b4a81cf0e750f3b1",
  "SFX_07_Battle_Victory.mp3": "9448b07c9a51e1fac44049adf323309bb985893b48a797042e2837580e04122b",
  "SFX_08_Battle_Draw.mp3": "2ed8515fe2e8c2f27fa7fab543c1c3cb0e084e8c1e19b10e5d889fc4bb76bc4b",
  "SFX_09_Battle_Defeat.mp3": "5d7080b53708cac28be1e5270d27aa25358576593236c9bd6216c9b7b99dfff8",
  "SFX_10_Collar_Select.mp3": "f7e67a9bf049281c7c99d4cda200aa530cadf749755e7ea377d1b61dc0acade6",
  "SFX_11_Dog_Discover.mp3": "545067c8ccf704227657a578bc5078f5705a382cab2ae87e35f3805150337a85",
  "SFX_12_Bark_Variant_01.mp3": "30ae78288f777d0f252424d03b7fce5a0b6b44e535af5badd806d645f2f6ecb2",
  "SFX_13_Bark_Variant_02.mp3": "11752c641e79d29c8d3b6b305785162551e6a250d81b2f9e09dddc8b51e519bf",
  "SFX_14_Bark_Variant_03.mp3": "6455fd4472a94b59a6bb2eea234ec5d9be6282abf24cf54898cc1ca1195a447c",
  "SFX_15_Dog_Snack.mp3": "bc286997fa1ab3f125d6a5eb109769dbc210d24d944dc1292ed3aa58e95d4e10",
  "SFX_16_Dog_Praise.mp3": "6b203f8f194629a0691d824fef7eb2956fc72e07e140ed1507962fa88a1e01a7",
  "SFX_17_Dog_Play.mp3": "dc257bc97155f5a176fb4a9a9a3ad43d2869203a5e77c999fcfe28f8775cc888",
  "SFX_18_Camera_Shutter.mp3": "7ab80cc490981f25274e26f89f265f3255b3783fc47046a99c4cec241ad6f1ec",
  "SFX_19_Card_Acquired.mp3": "4d191782446e4675cb983f73f29816917dd1496c9c19374c6185e7d41bb4d591"
};
const dir=join(process.cwd(),'public','audio','meonggo');
let failed=0;
for(const [name,digest] of Object.entries(expected)){
 const path=join(dir,name);
 if(!existsSync(path)){console.error('MISSING '+path);failed++;continue;}
 const actual=createHash('sha256').update(readFileSync(path)).digest('hex');
 if(actual!==digest){console.error('HASH MISMATCH '+name);failed++;}
 else console.log('OK '+name);
}
if(failed){console.error(failed+' approved audio files missing/changed');process.exitCode=1;}
else console.log('Verified all '+Object.keys(expected).length+' approved MeongGO tracks.');
