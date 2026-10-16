import fs from 'node:fs';
const source=process.env.DICTIONARY_DATA_FILE||'examples/sample.json';
const data=JSON.parse(fs.readFileSync(source,'utf8').replace(/^\uFEFF/,''));
if(data.schemaVersion!==3||!Array.isArray(data.articles)||data.count!==data.articles.length)throw Error('Invalid dictionary dataset');
const allowed=new Set(['id','title','body','url','category','aliases','tags','date','updatedAt']);
const ids=new Set();
for(const a of data.articles){if(!a.id||!a.title||ids.has(a.id))throw Error('Invalid or duplicate article');ids.add(a.id);for(const key of Object.keys(a))if(!allowed.has(key))throw Error('Unexpected data field: '+key);}
fs.mkdirSync('dist',{recursive:true});
for(const name of ['index.html','app.js','search.js','styles.css'])fs.copyFileSync('web/'+name,'dist/'+name);
fs.writeFileSync('dist/headings.json',JSON.stringify(data));
fs.writeFileSync('dist/.nojekyll','');
console.log('Built '+data.count+' articles, '+data.articles.filter(a=>a.body).length+' descriptions');
