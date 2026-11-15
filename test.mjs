import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {JSDOM}=require('jsdom');
const dictionary=JSON.parse(fs.readFileSync(new URL('./dictionary.json',import.meta.url),'utf8'));
const runtime=fs.readFileSync(new URL('./runtime.js',import.meta.url),'utf8').replace('/*__DICTIONARY__*/ {}',JSON.stringify(dictionary));
const wait=()=>new Promise(r=>setTimeout(r,30));
async function setup(body){
 const dom=new JSDOM('<html><head><title>Settings • Example • Paperclip</title></head><body>'+body+'</body></html>',{url:'http://localhost:3100/EX/dashboard',runScripts:'outside-only'});
 dom.window.fetch=()=>{throw Error('No network allowed')};dom.window.eval(runtime);await wait();return dom;
}
test('navigation, deep settings, help and accessibility strings',async()=>{
 const dom=await setup('<nav><a href="/EX/agents">Agents</a><a href="/EX/routines">Routines</a></nav><h2>INTERACTION GOVERNANCE</h2><button aria-label="Open Example organization switcher">No cap</button><input placeholder="Search agents…"><p>All agents in this organization are paused — nothing will run.</p>');
 const d=dom.window.document;
 assert.match(d.body.textContent,/에이전트/);assert.match(d.body.textContent,/반복 작업/);
 assert.match(d.body.textContent,/요청과 승인 처리 규칙/);assert.match(d.body.textContent,/추가 제한 없음/);
 assert.equal(d.querySelector('button').getAttribute('aria-label'),'Example 조직 선택');
 assert.equal(d.querySelector('input').placeholder,'에이전트 검색…');assert.equal(d.documentElement.lang,'ko');
 assert.match(d.title,/설정 • Example/);assert.match(d.body.textContent,/자동으로 실행되는 작업은 없습니다/);dom.window.close();
});
test('preserves user data, credentials, code, comments, task titles and agent names',async()=>{
 const dom=await setup('<button aria-label="Open Example organization switcher"></button><input value="Run" type="password"><textarea placeholder="Describe a task…">Save</textarea><pre>Run</pre><code>Delete</code><div contenteditable="true">Cancel</div><div class="prose">Save</div><a href="/EX/issues/EX-1"><span>Save</span></a><a href="/EX/agents/alpha"><span>Idle</span></a><div>Example</div>');
 const d=dom.window.document;
 assert.equal(d.querySelector('input').value,'Run');assert.equal(d.querySelector('textarea').value,'Save');assert.equal(d.querySelector('textarea').placeholder,'할 일을 설명해 주세요…');
 for(const [selector,text] of [['pre','Run'],['code','Delete'],['[contenteditable]','Cancel'],['.prose','Save'],['a','Save']])assert.equal(d.querySelector(selector).textContent,text);
 assert.equal(d.querySelectorAll('a')[1].textContent,'Idle');assert.match(d.body.textContent,/Example/);dom.window.close();
});
test('keeps React-style nodes and event handlers intact across dynamic updates',async()=>{
 const dom=await setup('<button id="save">Save</button>'); const d=dom.window.document;
 const button=d.querySelector('button'), node=button.firstChild;let clicked=0;button.addEventListener('click',()=>clicked++);
 button.click();assert.equal(clicked,1);assert.equal(button.firstChild,node);assert.equal(node.nodeValue,'저장');
 node.nodeValue='Cancel';await wait();assert.equal(button.firstChild,node);assert.equal(node.nodeValue,'취소');
 const dialog=d.createElement('div');dialog.innerHTML='<h3>Backup retention</h3><span>7 days</span><span>3 running</span>';d.body.append(dialog);await wait();
 assert.equal(dialog.querySelector('h3').textContent,'백업 보관 기간');assert.equal(dialog.querySelector('span').textContent,'7일');assert.match(dialog.textContent,/3개 실행 중/);
 const count=d.documentElement.dataset.paperclipKoTranslations;await wait();assert.equal(d.documentElement.dataset.paperclipKoTranslations,count);dom.window.close();
});
test('translates agent subpage navigation and split warnings while preserving entity names',async()=>{
 const dom=await setup('<nav aria-label="Example navigation"><a href="/EX/agents/alpha/runtime">Harness / Runtime</a></nav><a href="/EX/agents/beta/overview">Skills</a><p><span class="font-medium">Alpha</span> is paused and will not start work on this task until it is resumed<!-- -->. You can resume it from the task page after creating the task.</p><span>17<!-- --> agents</span>');
 const d=dom.window.document;
 assert.equal(d.querySelector('nav a').textContent,'에이전트 실행 환경');
 assert.equal(d.querySelectorAll('a')[1].textContent,'Skills');
 assert.match(d.querySelector('p').textContent,/Alpha 에이전트는 일시 중지/);
 assert.doesNotMatch(d.querySelector('body > span').textContent,/agents/);
 dom.window.close();
});
test('dictionary values are plain text and do not introduce executable markup',()=>{
 assert.ok(Object.keys(dictionary).length>=1500);
 for(const value of Object.values(dictionary)){assert.equal(typeof value,'string');assert.doesNotMatch(value,/<(?:script|iframe|img)\b/i);}
});
