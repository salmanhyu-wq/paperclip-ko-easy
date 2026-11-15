/* Paperclip Korean display patch. See THIRD_PARTY_NOTICES.md for dictionary credits. */
(() => {
  'use strict';
  const VERSION = '1.0.0';
  const dictionary = /*__DICTIONARY__*/ {};
  const normalized = new Map(Object.entries(dictionary).map(([key, value]) => [key.replace(/\s+/g, ' ').trim(), value]));
  const uppercase = new Map(Object.entries(dictionary).map(([key, value]) => [key.toUpperCase(), value]));
  const attributes = ['aria-label', 'placeholder', 'data-placeholder', 'title', 'alt'];
  const protectedSelector = 'script,style,title,pre,code,textarea,[contenteditable="true"],.prose,.markdown-body,[data-markdown],[data-paperclip-ko-preserve]';
  const entityPath = /\/(?:issues|agents|projects|routines|artifacts|u)\/(?!new(?:[/?#]|$)|all(?:[/?#]|$))[^/?#]+/;
  const units = {s:'초',m:'분',h:'시간',d:'일',second:'초',seconds:'초',minute:'분',minutes:'분',hour:'시간',hours:'시간',day:'일',days:'일',week:'주',weeks:'주',month:'개월',months:'개월'};
  const properNames = new Set();
  let count = 0;
  function translate(raw) {
    if (typeof raw !== 'string' || !raw.trim()) return raw;
    const text = raw.trim(), key = text.replace(/\s+/g, ' ');
    if (properNames.has(key)) return raw;
    let value = normalized.get(key);
    if (!value && /^[A-Z][A-Z\s+()\-/]+$/.test(key)) value = uppercase.get(key);
    if (!value) {
      let m;
      if ((m = key.match(/^Finished (\d+)\s*([smhd]) ago$/))) value = `${m[1]}${units[m[2]]} 전에 완료`;
      else if ((m = key.match(/^(\d+)\s*([smhd]) ago$/))) value = `${m[1]}${units[m[2]]} 전`;
      else if ((m = key.match(/^(\d+) (seconds?|minutes?|hours?|days?|weeks?|months?)$/))) value = `${m[1]}${units[m[2]]}`;
      else if ((m = key.match(/^(\d+) (running|paused|errors?|open|blocked)$/))) value = `${m[1]}개 ${ {running:'실행 중',paused:'일시 중지',error:'오류',errors:'오류',open:'열림',blocked:'진행 막힘'}[m[2]] }`;
      else if ((m = key.match(/^Open (.+) organization switcher$/))) value = `${m[1]} 조직 선택`;
      else if ((m = key.match(/^Open actions for (.+)$/))) value = `${m[1]} 작업 메뉴 열기`;
      else if ((m = key.match(/^More actions for (.+)$/))) value = `${m[1]} 더 보기`;
      else if ((m = key.match(/^(.+) — (Succeeded|Failed|Running)\. View run$/))) value = `${m[1]} — ${translate(m[2])}. 실행 기록 보기`;
      else if ((m = key.match(/^(Default resolver audience|Resolver cap) for (.+)$/))) value = `${translate(m[2])}: ${m[1] === 'Default resolver audience' ? '응답할 수 있는 범위' : '허용 범위 상한'}`;
      else if ((m = key.match(/^(.+) is paused and will not start work on this task until it is resumed\. You can resume it from the task page after creating the task\.$/))) value = `${m[1]} 에이전트는 일시 중지되어 있어 이 작업을 시작하지 않습니다. 작업을 만든 뒤 작업 화면에서 다시 실행할 수 있습니다.`;
      else if ((m = key.match(/^Click the avatar to upload a new image\. Stored in Paperclip file storage for (.+)\.$/))) value = `프로필 사진을 누르면 새 사진을 올릴 수 있습니다. 사진은 ${m[1]} 조직의 Paperclip 파일 저장소에 보관됩니다.`;
      else if ((m = key.match(/^(\d+)[–-](\d+) of (\d+) connectors$/))) value = `전체 연결 서비스 ${m[3]}개 중 ${m[1]}–${m[2]}개`;
      else if ((m = key.match(/^Page (\d+) of (\d+)$/))) value = `${m[2]}쪽 중 ${m[1]}쪽`;
      else if ((m = key.match(/^(.+) navigation$/))) value = `${m[1]} 화면 메뉴`;
      else if ((m = key.match(/^(.+) avatar$/))) value = `${m[1]} 프로필 사진`;
      else if ((m = key.match(/^Star (.+)$/))) value = `${m[1]} 즐겨찾기에 추가`;
      else if ((m = key.match(/^Select (assignee|project|status|priority|agent|model|connection)$/))) value = `${translate(m[1][0].toUpperCase()+m[1].slice(1))} 선택`;
      else if ((m = key.match(/^Select (.+)$/))) value = `${m[1]} 선택`;
      else if ((m = key.match(/^Connect (.+)'s provider-hosted MCP server\.$/))) value = `${m[1]}에서 제공하는 MCP 서버에 연결합니다.`;
      else if ((m = key.match(/^(\d+) (agents|tasks|routines|projects|skills)$/))) value = `${translate(m[2][0].toUpperCase()+m[2].slice(1))} ${m[1]}개`;
      else if ((m = key.match(/^(\d+) more active\/recent runs?$/))) value = `최근 실행 ${m[1]}개 더 보기`;
      else if ((m = key.match(/^Search (tasks|agents|projects|routines|skills|connectors)(…|\.\.\.)?$/i))) value = `${translate(m[1][0].toUpperCase()+m[1].slice(1))} 검색${m[2] ? '…' : ''}`;
    }
    return value ? raw.replace(text, value) : raw;
  }
  function protectedText(element) {
    if (!element || element.closest(protectedSelector)) return true;
    const link = element.closest('a[href]');
    if (link && !link.hasAttribute('aria-label') && link.getAttribute('href').includes('/runs/') && link.textContent.trim()==='No linked task') return false;
    if (link && (link.closest('nav[aria-label$=" navigation"],nav[aria-label$=" 화면 메뉴"]') || ['Configure','Manage','설정','관리'].includes(link.textContent.trim()))) return false;
    if (element.closest('time,.tabular-nums,.status-chip,[data-slot=badge],[data-status]')) return false;
    // Keep user-authored entity names, task titles and conversations in their original language.
    return !!(link && entityPath.test(link.getAttribute('href') || '') && !element.closest('[data-slot="badge"],[data-status]'));
  }
  function textNode(node) {
    if (protectedText(node.parentElement)) return;
    // The paused-agent warning renders the user-selected name in a separate strong node.
    if (node.parentElement.matches('strong') && / is paused and will not start work on this task/.test(node.parentElement.parentElement.textContent)) return;
    const next = translate(node.nodeValue);
    if (next !== node.nodeValue) { node.nodeValue = next; count++; }
  }
  function elementAttributes(element) {
    if (element.closest('script,style,pre,code')) return;
    for (const attr of attributes) {
      if ((attr === 'title' || attr === 'alt') && protectedText(element)) continue;
      const old = element.getAttribute(attr);
      const next = translate(old);
      if (old !== null && next !== old) { element.setAttribute(attr, next); count++; }
    }
  }
  function rememberNames() {
    for (const button of document.querySelectorAll('[aria-label$=" organization switcher"],[aria-label$=" 조직 선택"]')) {
      const raw=button.getAttribute('aria-label');
      const match=raw.match(/^Open (.+) organization switcher$/) || raw.match(/^(.+) 조직 선택$/);
      if (match) properNames.add(match[1]);
    }
  }
  function tree(root) {
    if (root.nodeType === Node.TEXT_NODE) { textNode(root); return; }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
    if (root.nodeType === Node.ELEMENT_NODE) {
      elementAttributes(root);
      if (root.closest(protectedSelector)) return;
    }
    const elements = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    while (elements.nextNode()) elementAttributes(elements.currentNode);
    const texts = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (texts.nextNode()) textNode(texts.currentNode);
  }
  function title() {
    const parts = document.title.split(/(\s*[•·]\s*)/);
    if (!entityPath.test(location.pathname)) parts[0] = translate(parts[0]);
    const next = parts.join('');
    if (document.title !== next) document.title = next;
  }
  function start() {
    const html = document.documentElement;
    html.lang = 'ko'; html.setAttribute('translate', 'no');
    html.dataset.paperclipKoEasy = VERSION;
    for (const button of document.querySelectorAll('[aria-label$=" organization switcher"]')) {
      const match = button.getAttribute('aria-label').match(/^Open (.+) organization switcher$/);
      if (match) properNames.add(match[1]);
    }
    tree(document.body); title();
    let queued = false;
    const dirty = new Set();
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'characterData' || record.type === 'attributes') dirty.add(record.target);
        else for (const node of record.addedNodes) dirty.add(node);
      }
      if (queued || !dirty.size) return;
      queued = true;
      setTimeout(() => {
        queued = false;
        const nodes = [...dirty]; dirty.clear();
        rememberNames();
        if (nodes.length > 150) tree(document.body);
        else for (const node of nodes) if (node.isConnected) tree(node);
        title(); html.dataset.paperclipKoTranslations = String(count);
      }, 0);
    });
    observer.observe(html, {childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:attributes});
    html.dataset.paperclipKoTranslations = String(count);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
