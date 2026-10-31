// Install only the 21 original, approved MP3s from the exact handoff archive.
// Built-in Node.js ZIP decoder: no external unzip binaries or extra dependencies.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join,basename} from 'node:path';
import {createHash} from 'node:crypto';
import {inflateRawSync} from 'node:zlib';

const file=join(process.cwd(),'assets','MeongGO_approved_audio_source_20261031.zip');
const zip=readFileSync(file);
const approved='805d12eeedba2ae157aabf5e5d0ae1b1a3a3d40bb1e227174dcfbd3dea1c4702';
if(createHash('sha256').update(zip).digest('hex')!==approved)throw new Error('Unapproved MeongGO audio archive');
const read16=n=>zip.readUInt16LE(n),read32=n=>zip.readUInt32LE(n);
let eocd=-1;
for(let p=zip.length-22;p>=Math.max(0,zip.length-65557);p--){
 if(read32(p)===0x06054b50){eocd=p;break;}
}
if(eocd<0)throw new Error('ZIP central directory missing');
const count=read16(eocd+10);
let p=read32(eocd+16),written=0;
const allowed=/^(?:BGM_0[23]_[A-Za-z0-9_]+|SFX_(?:0[1-9]|1[0-9])_[A-Za-z0-9_]+)\.mp3$/;
const out=join(process.cwd(),'public','audio','meonggo');
mkdirSync(out,{recursive:true});
for(let i=0;i<count;i++){
 if(read32(p)!==0x02014b50)throw new Error('Invalid ZIP entry '+i);
 const method=read16(p+10),size=read32(p+20),expectedLength=read32(p+24);
 const nlen=read16(p+28),extra=read16(p+30),comment=read16(p+32),local=read32(p+42);
 const name=zip.subarray(p+46,p+46+nlen).toString('utf8');
 p+=46+nlen+extra+comment;
 const nameOnly=basename(name);
 if(!allowed.test(nameOnly))continue; // PREVIEWs intentionally omitted.
 if(read32(local)!==0x04034b50)throw new Error('Invalid ZIP local entry '+name);
 const off=local+30+read16(local+26)+read16(local+28);
 const payload=zip.subarray(off,off+size);
 const bytes=method===8?inflateRawSync(payload):method===0?payload:null;
 if(!bytes||bytes.length!==expectedLength||expectedLength>2_000_000)throw new Error('Invalid MP3 '+name);
 writeFileSync(join(out,nameOnly),bytes);
 written++;
}
if(written!==21)throw new Error('Expected 21 individual approved MP3s, received '+written);
console.log('Installed '+written+' approved MeongGO MP3s from verified source ZIP.');
