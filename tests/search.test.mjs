import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const src=fs.readFileSync('web/search.js','utf8');const ctx=vm.createContext({});vm.runInContext(src.slice(0,src.indexOf('function attachSearchSuggestions')),ctx);
const rows=[{id:'a',title:'VRCお笑い道場',reading:'ぶいあーるしーおわらいどうじょう',aliases:['コメディ'],tags:['お笑い'],category:'イベント'}];
assert.equal(ctx.getSearchSuggestions(rows,'お笑い').items[0].article.id,'a');assert.equal(ctx.getSearchSuggestions(rows,'オワライ').total,1);assert.equal(ctx.getSearchSuggestions(rows,'コメディ').total,1);
const large=Array.from({length:5000},(_,i)=>({id:String(i),title:'サンプル'+i,tags:[]}));large[4800]=rows[0];assert.equal(ctx.getSearchSuggestions(large,'お笑い').items[0].article.id,'a');assert.equal(ctx.getSearchSuggestions(large,'サンプル').items.length,6);
for(const file of ['web/app.js','web/search.js']){const text=fs.readFileSync(file,'utf8');assert.ok(!text.includes('.innerHTML'));new vm.Script(text);}
const data=JSON.parse(fs.readFileSync(process.env.DICTIONARY_DATA_FILE||'examples/sample.json','utf8'));assert.equal(data.count,data.articles.length);assert.equal(new Set(data.articles.map(a=>a.id)).size,data.count);
console.log('Search, syntax, data integrity and safe rendering checks passed.');
