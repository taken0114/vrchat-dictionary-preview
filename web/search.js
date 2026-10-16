'use strict';
// Search only short index fields; bodies remain available in the full results.
function searchNormalize(value){return String(value||'').normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));}
function getSearchSuggestions(articles,query,limit=6){
 const q=searchNormalize(query).trim();if(!q)return {items:[],total:0};
 const words=q.split(/\s+/);const matches=[];
 for(const article of articles){
  const title=searchNormalize(article.title),reading=searchNormalize(article.reading);
  const aliases=(article.aliases||[]).map(searchNormalize),tags=(article.tags||[]).map(searchNormalize);
  const fields=[title,reading,...aliases,...tags];
  if(!words.every(word=>fields.some(field=>field.includes(word))))continue;
  const score=title===q?0:title.startsWith(q)?1:title.includes(q)?2:reading.includes(q)?3:aliases.some(a=>a.includes(q))?4:5;
  matches.push({article,score,reason:score<=2?'記事名':score===3?'読み':score===4?'別名':'タグ'});
 }
 matches.sort((a,b)=>a.score-b.score||String(a.article.reading||a.article.title).localeCompare(String(b.article.reading||b.article.title),'ja'));
 return {items:matches.slice(0,limit),total:matches.length};
}
function attachSearchSuggestions(input,form,{getArticles,onSearch}){
 const panel=document.createElement('div');panel.className='search-suggestions';panel.hidden=true;
 const heading=document.createElement('div');heading.className='suggestion-heading';
 const list=document.createElement('ul');list.id='search-suggestion-list';list.className='suggestion-list';list.setAttribute('role','listbox');list.setAttribute('aria-label','記事の候補');
 const all=document.createElement('button');all.type='button';all.className='suggestion-all';
 const live=document.createElement('div');live.className='sr-only';live.setAttribute('role','status');live.setAttribute('aria-live','polite');
 panel.append(heading,list,all);form.append(panel,live);
 input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls',list.id);input.setAttribute('aria-expanded','false');input.setAttribute('aria-haspopup','listbox');
 let items=[],active=-1,composing=false,closeTimer;
 function close(){panel.hidden=true;active=-1;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');}
 function openArticle(article){close();location.hash='#article/'+encodeURIComponent(article.id);}
 function choose(index){active=index;const children=[...list.children];children.forEach((n,i)=>n.setAttribute('aria-selected',String(i===active)));if(active>=0){input.setAttribute('aria-activedescendant',children[active].id);children[active].scrollIntoView({block:'nearest'});}else input.removeAttribute('aria-activedescendant');}
 function refresh(){
  clearTimeout(closeTimer);if(composing){close();return;}
  const q=input.value.trim();if(!q){close();live.textContent='';return;}
  const result=getSearchSuggestions(getArticles(),q);items=result.items;active=-1;list.replaceChildren();input.removeAttribute('aria-activedescendant');
  heading.textContent=items.length?'記事の候補 · '+result.total+'件':'一致する記事の候補はありません';
  items.forEach((item,index)=>{const a=item.article;const row=document.createElement('li');row.id='search-option-'+index;row.className='suggestion-option';row.setAttribute('role','option');row.setAttribute('aria-selected','false');
   const text=document.createElement('span');text.className='suggestion-text';const title=document.createElement('strong');title.textContent=a.title;
   const sub=document.createElement('small');sub.textContent=[a.reading,(a.tags||[]).slice(0,2).join(' · ')].filter(Boolean).join(' / ');text.append(title,sub);
   const category=document.createElement('span');category.className='suggestion-category';category.textContent=a.category||'記事';
   const arrow=document.createElement('span');arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');row.append(text,category,arrow);
   row.addEventListener('pointerdown',e=>{e.preventDefault();});row.addEventListener('click',()=>openArticle(a));row.addEventListener('pointermove',()=>choose(index));list.append(row);
  });
  all.textContent='「'+q+'」で全文検索　→';panel.hidden=false;input.setAttribute('aria-expanded','true');live.textContent=items.length?result.total+'件の候補。上下キーで選択、Enterで記事を開けます。':'候補はありません。Enterで本文も検索できます。';
 }
 all.addEventListener('pointerdown',e=>e.preventDefault());all.addEventListener('click',()=>{close();onSearch();});
 input.addEventListener('input',refresh);input.addEventListener('focus',refresh);
 input.addEventListener('compositionstart',()=>{composing=true;close();});input.addEventListener('compositionend',()=>{composing=false;refresh();});
 input.addEventListener('blur',()=>{closeTimer=setTimeout(close,120);});
 input.addEventListener('keydown',e=>{if(composing||e.isComposing||e.keyCode===229)return;
  if(e.key==='Escape'){if(!panel.hidden){e.preventDefault();e.stopPropagation();close();}return;}
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){if(panel.hidden)refresh();if(!items.length||panel.hidden)return;e.preventDefault();choose(e.key==='ArrowDown'?(active+1)%items.length:(active<=0?items.length-1:active-1));return;}
  if(e.key==='Enter'&&!panel.hidden&&active>=0){e.preventDefault();openArticle(items[active].article);}
 });
 form.addEventListener('submit',close);
 document.addEventListener('pointerdown',outside,{capture:true});
 function outside(e){if(!form.isConnected){document.removeEventListener('pointerdown',outside,{capture:true});return;}if(!form.contains(e.target))close();}
 return {close,refresh};
}
