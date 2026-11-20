import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=['public/graph-atlas.js','public/graph-investigation.js'].map(p=>readFileSync(p,'utf8')).join('\n');
const api=runInNewContext(source+'\n({atlasSurfacePaths,downstreamClaims,shortestGraphRoutes,locateReviewedQuote,reviewAnchor,quoteComparison,atlasCloud,investigationSpec})',{document:{addEventListener(){}}});
const nodes=ids=>[...ids].map(id=>({id,name:id,kind:'file'}));
const link=(from,to,kind='reference')=>({from,to,kind});
const plain=value=>JSON.parse(JSON.stringify(value));

test('paths are bounded and reproducible across reordered links, cycles and duplicate records of an edge',()=>{
 const rows=nodes('abcdefx');
 const links=['b','c','d','e'].flatMap(id=>[link('a',id),link(id,'f')]);
 links.push(link('a','b'),link('b','a'),link('a','a'),link('a','unknown'),link('unknown','f'));
 const result=api.shortestGraphRoutes(rows,links,'a','f');
 assert.equal(result.more,true);
 assert.deepEqual(plain(result.routes.map(r=>r.ids)),[['a','b','f'],['a','c','f'],['a','d','f']]);
 assert.deepEqual(plain(api.shortestGraphRoutes(rows,[...links].reverse(),'a','f')),plain(result));
 assert.equal(api.shortestGraphRoutes(rows,links,'f','a').routes.length,0);
 assert.equal(api.shortestGraphRoutes(rows,links,'a','x','either').routes.length,0);
 assert.equal(api.shortestGraphRoutes(rows,links,'unknown','f').routes.length,0);
 assert.equal(api.shortestGraphRoutes(rows,links,'f','f').routes[0].edges.length,0);
});
test('a reversed path preserves each actual direction and declared sources exclude ordinary links',()=>{
 const rows=nodes('abcd');rows[1].research={sources:['a']};
 const links=[link('a','b'),link('b','c','wikilink'),link('d','c','context')];
 const path=api.shortestGraphRoutes(rows,links,'a','d','either').routes[0];
 assert.deepEqual(plain(path.ids),['a','b','c','d']);assert.deepEqual(plain(path.edges.at(-1)),links[2]);
 assert.equal(api.shortestGraphRoutes(rows,links,'a','b','citations').routes.length,1);
 assert.equal(api.shortestGraphRoutes(rows,links,'a','c','citations').routes.length,0);
});
test('selected context disambiguates repeated text without guessing a position after an edit',()=>{
 const exact='the same field result',text='First site: '+exact+'. Next site: '+exact+'.';
 const offset=text.lastIndexOf(exact),anchor=api.reviewAnchor(text,exact,offset);
 assert.deepEqual(plain(api.locateReviewedQuote(text,exact)),{offset:-1,count:2});
 assert.deepEqual(plain(api.locateReviewedQuote(text,exact,anchor)),{offset,count:2});
 assert.equal(api.locateReviewedQuote('Changed. '+text,exact,anchor).offset,offset+9);
 assert.equal(api.locateReviewedQuote(exact+' / '+exact,exact,anchor).offset,-1);
 assert.equal(api.reviewAnchor(text,exact,0),undefined);
});
test('evidence comparison distinguishes changed sources, withdrawn links, missing snapshots and legacy records',()=>{
 const quote={id:'s',excerpt:'field result',revision:'v'},source={id:'s',text:'Old field result.'},rev=[{id:'v',source:'s',text:source.text}];
 const check=(q,s,r=rev,linked=true)=>api.quoteComparison(q,s,r,linked);
 assert.match(check(quote,source).status,/Matches reviewed/);
 const changed=check(quote,{...source,text:'Different.'});
 assert.equal(changed.current.count,0);assert.equal(changed.saved.count,1);assert.match(changed.status,/changed/);
 assert.match(check(quote,source,rev,false).status,/link removed/);
 assert.match(check(quote,source,[]).status,/version unavailable/);
 assert.match(check({...quote,revision:null},source).status,/no saved version/);
 assert.deepEqual(plain(check(quote,undefined)),{status:'Source unavailable in this workspace'});
});
test('each region accounts for real members and both ends of boundary edges',()=>{
 const rows=nodes('abcdefx');rows[0].kind=rows[3].kind='agent';
 const links=[link('a','b'),link('b','c'),link('c','d'),link('d','e'),link('e','f')];
 const {regions}=api.atlasCloud(rows,links);
 assert.deepEqual(regions.flatMap(r=>Array.from(r.ids)).sort().join(''),'abcdefx');
 assert.equal(regions.find(r=>r.id==='isolated').ids.join(''),'x');
 assert.equal(regions.reduce((s,r)=>s+r.boundary,0),2);
 assert.deepEqual(plain(regions),plain(api.atlasCloud(rows.reverse(),links.reverse()).regions));
});
test('saved investigations contain only the active query and no text or computed results',()=>{
 assert.deepEqual(plain(api.investigationSpec({tab:'paths',from:'a',to:'z',rule:'either',claim:'private',model:{},index:0})),{tab:'paths',from:'a',to:'z',rule:'either'});
});
test('downstream citations include indirect dependents, skip superseded claims and terminate cycles',()=>{
 const rows=nodes('abcdex');
 for(const [i,refs,state] of [[1,['a','c'],'evidence'],[2,['b'],'supported'],[3,['a'],'superseded'],[4,['a','b'],'supported']]){
  rows[i].research={state,quotes:refs.map(id=>({id})),sources:refs};
 }
 assert.deepEqual(plain(api.downstreamClaims(rows,'a').rows.map(r=>[r.record.id,r.depth])),[['b',1],['e',1],['c',2]]);
 assert.equal(api.downstreamClaims(rows,'outside').rows.length,0);
 assert.equal(api.downstreamClaims(rows,'x').rows.length,0);
 rows[5].research={state:'supported',quotes:[{id:'d'}]};
 const afterCorrection=api.downstreamClaims(rows,'a');
 assert.equal(afterCorrection.rows.find(r=>r.record.id==='x').depth,2);
 assert.ok(!afterCorrection.rows.some(r=>r.record.id==='d')&&afterCorrection.ids.has('d'));
});
test('active rotation samples decorative geometry and release restores the full surface at the same angle',()=>{
 const still=api.atlasSurfacePaths(.2),moving=api.atlasSurfacePaths(.2,true);
 assert.equal(moving.length,still.length);assert.ok(moving.join('').length<still.join('').length*.3);
 assert.equal(api.atlasSurfacePaths(.2,false),still);
});
