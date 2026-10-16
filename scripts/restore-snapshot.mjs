import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
const parts=Array.from({length:12},(_,i)=>process.env['SNAPSHOT_'+i]||'');
const payload=parts.join('');if(!payload)throw Error('Publication snapshot has not been configured');
const bytes=gunzipSync(Buffer.from(payload,'base64'));
fs.mkdirSync('private-data',{recursive:true});fs.writeFileSync('private-data/snapshot.json',bytes);
