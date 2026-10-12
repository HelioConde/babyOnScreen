'use strict';
// CI-only Electron smoke test. Does not alter normal production startup.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
if (process.platform !== 'win32') process.exit(0);
const root = path.resolve(__dirname, '..');
const binary = path.join(root, 'dist', 'win-unpacked', 'Baby On Screen.exe');
const screenshot = path.join(root, 'dist', 'windows-desktop-smoke.png');
const port = 19200 + process.pid % 1500;
const delay = ms => new Promise(r => setTimeout(r, ms));
let child, socket;
async function findPage() {
  const until = Date.now() + 60000;
  while (Date.now() < until) {
    if (child.exitCode !== null) throw new Error('Electron process exited before its page loaded: ' + child.exitCode);
    try {
      const response = await fetch('http://127.0.0.1:' + port + '/json/list', {
        signal: AbortSignal.timeout(1500)
      });
      if (response.ok) {
        const targets = await response.json();
        const page = targets.find(t => t.type === 'page' && /\/app\/index\.html(?:[?#]|$)/.test(t.url));
        if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
      }
    } catch { /* waiting for the application */ }
    await delay(500);
  }
  throw new Error('Electron did not start a debuggable desktop page within 45 seconds');
}
async function connect(url) {
  const ws = new WebSocket(url);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out opening Chromium debugger')), 10000);
    ws.addEventListener('open', () => { clearTimeout(timeout); resolve(); }, {once:true});
    ws.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('WebSocket connection failed')); }, {once:true});
  });
  let nextId = 0;
  const pending = new Map();
  ws.addEventListener('message', event => {
    let data;
    try { data = JSON.parse(event.data); } catch { return; }
    const pendingRequest = pending.get(data.id);
    if (pendingRequest) { pending.delete(data.id); pendingRequest(data); }
  });
  return { socket:ws, request(method,params={}) {
    return new Promise((resolve,reject) => {
      const id = ++nextId;
      const timeout = setTimeout(() => { pending.delete(id); reject(new Error('CDP method timed out: ' + method)); },45000);
      pending.set(id, response => {
        clearTimeout(timeout);
        if (response.error) reject(new Error(JSON.stringify(response.error)));
        else resolve(response.result);
      });
      ws.send(JSON.stringify({id,method,params}));
    });
  }};
}
async function main() {
  assert.ok(fs.existsSync(binary),'Packaged Electron runtime is missing');
  child = spawn(binary,[
    '--remote-debugging-port=' + port,
    '--remote-allow-origins=*',
    '--disable-gpu'
  ],{cwd:path.dirname(binary),stdio:'ignore',windowsHide:false});
  const wsUrl = await findPage();
  const cdp = await connect(wsUrl); socket=cdp.socket;
  await cdp.request('Runtime.enable');
  const script = '(() => {' +
    'const b=document.getElementById("baby"); const c=document.getElementById("baby-sprite"); const r=b?.getBoundingClientRect();' +
    'return {game:!!window.BabyEngine?.dailyStatus && !!window.BabyEngine?.renameBaby,' +
    'desktop:typeof window.babyDesktop?.setHitRegions==="function",' +
    'sprite:!!window.BabySpriteManifest?.child, width:r?.width,height:r?.height,' +
    'canvasW:c?.width,canvasH:c?.height,' +
    'size:window.BabySpritePresentation?.size,zoom:window.BabySpritePresentation?.zoom,' +
    'ready:b?.classList.contains("sprite-ready"),hidden:c?.hidden,' +
    'opaque:(()=>{try{const p=c.getContext("2d").getImageData(0,0,c.width,c.height).data;' +
    'let n=0;for(let i=3;i<p.length;i+=4)if(p[i]>0)n++;return n;}catch{return 0;}})(),' +
    'quests:document.querySelectorAll("#desktop-daily-list .desktop-daily-item").length,' +
    'missions:document.querySelectorAll("#desktop-missions-list .desktop-mission").length,' +
    'transparent:getComputedStyle(document.body).backgroundColor==="rgba(0, 0, 0, 0)",' +
    'noNode:typeof window.require==="undefined"};})()';
  let state;
  for(let i=0;i<35;i++){
    const res=await cdp.request('Runtime.evaluate',{expression:script,returnByValue:true});
    state=res.result?.value;
    if(state?.quests>=3 && state?.missions>=3 && state?.ready && state?.opaque>200) break;
    await delay(500);
  }
  console.log('Windows Electron runtime state:',JSON.stringify(state));
  // A fresh install must display an interactive guide inside the real overlay.
  const intro = await cdp.request('Runtime.evaluate', {
    expression:'(() => ({panel:!document.getElementById("panel").hidden,' +
      'visible:!document.getElementById("welcome-tour").hidden,' +
      'count:document.getElementById("welcome-count").textContent,' +
      'title:document.getElementById("welcome-title").textContent}))()',
    returnByValue:true
  });
  const introState=intro.result?.value;
  console.log('First-start tutorial:',JSON.stringify(introState));
  assert.equal(introState?.panel,true);
  assert.equal(introState?.visible,true);
  assert.match(introState.count,/Passo 1 de 5/);
  assert.match(introState.title,/amiguinha chegou/);
  const tutorialNaming = await cdp.request('Runtime.evaluate',{
    expression:'(() => {const input=document.getElementById("welcome-baby-name");' +
      'if (!input || document.getElementById("welcome-name-field").hidden) return null;' +
      'document.getElementById("close-panel").click();' +
      'const blocked=!document.getElementById("panel").hidden;' +
      'document.getElementById("welcome-skip").click();' +
      'const before=JSON.parse(localStorage.getItem("baby-on-screen-v1")).babyName;' +
      'input.value="Estrelinha";input.dispatchEvent(new Event("input",{bubbles:true}));' +
      'const afterTyping=JSON.parse(localStorage.getItem("baby-on-screen-v1")).babyName;' +
      'document.getElementById("welcome-next").click();' +
      'return {blocked,before,afterTyping,' +
      'stored:JSON.parse(localStorage.getItem("baby-on-screen-v1")).babyName,' +
      'locked:localStorage.getItem("baby-on-screen-name-locked-v1"),' +
      'settings:document.getElementById("desktop-name-input").value,' +
      'label:document.getElementById("desktop-name-label").textContent,' +
      'nextStep:document.getElementById("welcome-count").textContent};})()',
    returnByValue:true
  });
  assert.deepEqual(tutorialNaming.result?.value,{
    blocked:true,before:'',afterTyping:'',
    stored:'Estrelinha',locked:'Estrelinha',settings:'Estrelinha',
    label:'Estrelinha',nextStep:'Passo 2 de 5'
  },'Name must be explicitly confirmed, saved once and impossible to bypass');
  let previewCheck;
  for (let attempt=0;attempt<25;attempt++) {
    previewCheck=await cdp.request('Runtime.evaluate',{
      expression:'(() => {const c=document.getElementById("welcome-preview");' +
        'const p=c.getContext("2d").getImageData(0,0,c.width,c.height).data;' +
        'let n=0;for(let i=3;i<p.length;i+=4)if(p[i]>0)n++;' +
        'return {width:c.width,height:c.height,visible:n,ready:document.getElementById("welcome-tour").classList.contains("welcome-sprite-ready")};})()',
      returnByValue:true
    });
    if (previewCheck.result?.value?.ready && previewCheck.result.value.visible>200) break;
    await delay(200);
  }
  console.log('Welcome uses live game sprite:',JSON.stringify(previewCheck.result?.value));
  assert.equal(previewCheck.result.value.width,128);
  assert.equal(previewCheck.result.value.height,128);
  assert.equal(previewCheck.result.value.ready,true);
  assert.ok(previewCheck.result.value.visible>200,'welcome illustration must show real baby art');
  const shotIntro = await cdp.request('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  fs.writeFileSync(path.join(root,'dist','windows-onboarding-smoke.png'),Buffer.from(shotIntro.data,'base64'));
  const checked = await cdp.request('Runtime.evaluate', {
    expression:'(() => {const steps=[];for(let i=0;i<3;i++){' +
      'document.getElementById("welcome-next").click();steps.push(document.getElementById("welcome-count").textContent);}' +
      'const finalLabel=document.getElementById("welcome-next").textContent;' +
      'document.getElementById("welcome-next").click();' +
      'const persisted=localStorage.getItem("baby-on-screen-guide-v1");' +
      'const dismissed=document.getElementById("welcome-tour").hidden;' +
      'document.getElementById("welcome-reopen").click();' +
      'const reopened=!document.getElementById("welcome-tour").hidden;' +
      'document.getElementById("welcome-skip").click();' +
      'return {steps,finalLabel,persisted,dismissed,reopened};})()',
    returnByValue:true
  });
  const guide=checked.result?.value;
  console.log('Tour navigation:',JSON.stringify(guide));
  assert.equal(guide?.steps?.join('|'),'Passo 3 de 5|Passo 4 de 5|Passo 5 de 5');
  assert.match(guide.finalLabel,/Começar a cuidar/);
  assert.equal(guide.persisted,'completed');
  assert.equal(guide.dismissed,true);
  assert.equal(guide.reopened,true);
  assert.ok(state?.game && state?.desktop && state?.sprite);
  assert.equal(state.width,128); assert.equal(state.height,128);
  assert.equal(state.canvasW,128); assert.equal(state.canvasH,128);
  assert.equal(state.size,128); assert.equal(state.zoom,1.06);
  assert.equal(state.ready,true,'PC must load the SAME atlas animation as Web, not CSS fallback');
  assert.equal(state.hidden,false);
  assert.ok(state.opaque>200,'actual PNG/WebP frame must be visible on the canvas');
  assert.ok(state.quests>=3 && state.missions>=3);
  assert.equal(state.transparent,true); assert.equal(state.noNode,true);
  // The real Windows overlay should not be one giant opaque occlusion area:
  // native window region must be clipped to its few visible elements.
  let nativeClip;
  for(let i=0;i<18;i++) {
    const result=await cdp.request('Runtime.evaluate',{
      expression:'window.babyDesktop.overlayGeometry()',awaitPromise:true,returnByValue:true
    });
    nativeClip=result.result?.value;
    if(nativeClip?.shaped && nativeClip?.visualCount>=2) break;
    await delay(180);
  }
  console.log('Native video-safe overlay shape:',JSON.stringify(nativeClip));
  assert.equal(nativeClip?.shaped,true,'Windows overlay must use native region clipping');
  assert.ok(nativeClip?.visualCount>=2);
  assert.ok(nativeClip?.coverage < .7,'overlay must not occlude the whole monitor');

  const result=await cdp.request('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  const png=Buffer.from(result.data,'base64');
  assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');
  assert.ok(png.readUInt32BE(16)>=600 && png.readUInt32BE(20)>=450);
  fs.writeFileSync(screenshot,png);
  // Open the real overlay panel and use the name control, without native click injection.
  const panelCheck = await cdp.request('Runtime.evaluate', {
    expression: '(() => {' +
      'if(document.getElementById("panel").hidden) document.getElementById("launcher").click();' +
      'const input=document.getElementById("desktop-name-input");' +
      'const readonly=input.readOnly;' +
      'input.value="Luna"; input.dispatchEvent(new Event("input",{bubbles:true}));' +
      'const panel=document.getElementById("panel"); const r=panel.getBoundingClientRect();' +
      'const save=JSON.parse(localStorage.getItem("baby-on-screen-v1"));' +
      'return {open:!panel.hidden,readonly,name:save.babyName,label:document.getElementById("desktop-name-label").textContent,' +
      'right:r.right,bottom:r.bottom,width:innerWidth,height:innerHeight};' +
    '})()',
    returnByValue:true
  });
  const p=panelCheck.result?.value;
  console.log('Windows UI panel check:',JSON.stringify(p));
  assert.ok(p?.open && p?.readonly && p?.name==='Estrelinha' && p?.label==='Estrelinha',
    'Settings must not change the permanent baby name');
  assert.ok(p.right<=p.width+2 && p.bottom<=p.height+2, 'The panel must fit on screen');
  const monitorState = await cdp.request('Runtime.evaluate',{
    expression:'(async () => {const info=await window.babyDesktop.desktopLayout();' +
      'const b=info.bounds;const screens=info.displays;' +
      'const current=await window.babyDesktop.moveToMonitor(info.activeId);' +
      'const invalid=await window.babyDesktop.moveToMonitor("__not_a_real_monitor__");' +
      'const after=await window.babyDesktop.desktopLayout();' +
      'const active=screens.find(d=>d.id===after.activeId);' +
      'return {origin:[b.x,b.y],screens:screens.length,screenX:active?.x,' +
      'hasMonitorPicker:document.getElementById("monitor-select").options.length===screens.length,' +
      'nativeMove:current.ok,invalidRejected:invalid.ok===false,' +
      'activeId:after.activeId,firstId:info.activeId,' +
      'covers:!!active&&active.x>=0&&active.y>=0&&' +
      'active.x+active.width<=after.bounds.width+1&&' +
      'active.y+active.height<=after.bounds.height+1};})()',
    awaitPromise:true,returnByValue:true
  });
  console.log('Windows monitor geometry:',JSON.stringify(monitorState.result?.value));
  assert.ok(monitorState.result?.value?.screens>=1);
  assert.equal(monitorState.result.value.hasMonitorPicker,true);
  assert.equal(monitorState.result.value.covers,true);
  assert.equal(monitorState.result.value.nativeMove,true,'The actual OS window must move to the requested display');
  assert.equal(monitorState.result.value.invalidRejected,true,'Invalid display IDs must be refused');
  assert.equal(monitorState.result.value.activeId,monitorState.result.value.firstId);
  // CDP native pointer injection is ignored by Electron's transparent
  // Windows overlay in CI (no physical cursor movement). Dispatch browser
  // PointerEvents to exercise the REAL renderer drag handlers instead;
  // click-through and monitor geometry are separately unit-tested.
  const panelDrag=await cdp.request('Runtime.evaluate',{
    expression:`(() => {
      const h=document.getElementById('panel-move-header');
      const panel=document.getElementById('panel');
      const before=panel.getBoundingClientRect();
      const origin={x:before.left,y:before.top};
      const x=before.left+32, y=before.top+23;
      const dx=before.left>110?-90:90;
      const trace=[];
      // Synthetic pointer ids cannot be captured, unlike genuine OS input.
      h.setPointerCapture=()=>{};
      h.releasePointerCapture=()=>{};
      for(const type of ['pointerdown','pointermove','pointerup'])
        h.addEventListener(type,e=>trace.push({type,x:e.clientX,id:e.pointerId}));
      function send(type,clientX){
        h.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:45,
          pointerType:'pen',button:0,clientX,clientY:y}));
      }
      send('pointerdown',x);
      send('pointermove',x+dx);
      send('pointerup',x+dx);
      const after=panel.getBoundingClientRect();
      return {before:origin,after:{x:after.left,y:after.top},
        stored:localStorage.getItem('baby-on-screen-panel-position-v1'),trace};
    })()`,
    returnByValue:true
  });
  console.log('Panel logic drag on real Electron:',JSON.stringify(panelDrag.result?.value));
  const panelDragResult=panelDrag.result?.value;
  assert.equal(panelDragResult?.trace?.length,3,'all three drag handlers must run');
  assert.ok(Math.abs(panelDragResult.after.x-panelDragResult.before.x)>25,
    'Panel should be draggable to a new screen position');
  assert.ok(panelDragResult.stored,'Panel position should survive restart');
  const switchMonitor = await cdp.request('Runtime.evaluate',{
    expression:'(() => {const select=document.getElementById("monitor-select");' +
      'select.value=select.options[0].value;select.dispatchEvent(new Event("change",{bubbles:true}));' +
      'const baby=document.getElementById("baby").getBoundingClientRect();' +
      'return {name:select.options[0].textContent,stored:localStorage.getItem("baby-on-screen-desktop-position-v1"),' +
      'babyLeft:baby.left,babyTop:baby.top};})()',
    returnByValue:true
  });
  assert.ok(switchMonitor.result.value.stored,'Choosing a monitor should save baby position');
  assert.ok(switchMonitor.result.value.babyLeft>=0 && switchMonitor.result.value.babyTop>=0);
  // Regression test: expanding the settings boxes may increase content height,
  // but must never send the whole panel to the bottom or another monitor.
  const stable = await cdp.request('Runtime.evaluate',{
    expression:'(() => {const panel=document.getElementById("panel");' +
      'const settings=[...panel.querySelectorAll("details")];' +
      'const before=panel.getBoundingClientRect();' +
      'const first={x:before.left,y:before.top,height:before.height};' +
      'settings.forEach(d=>d.open=true);' +
      'const afterOpen=panel.getBoundingClientRect();' +
      'settings.forEach(d=>d.open=false);' +
      'const afterClose=panel.getBoundingClientRect();' +
      'return {first,afterOpen:{x:afterOpen.left,y:afterOpen.top,height:afterOpen.height},' +
      'afterClose:{x:afterClose.left,y:afterClose.top,height:afterClose.height},' +
      'scrollHeight:document.getElementById("panel-scroll").scrollHeight,' +
      'clientHeight:document.getElementById("panel-scroll").clientHeight};})()',
    returnByValue:true
  });
  const stableBox=stable.result?.value;
  console.log('Expandable panel layout stays stable:',JSON.stringify(stableBox));
  for(const test of [stableBox.afterOpen,stableBox.afterClose]){
    assert.ok(Math.abs(test.x-stableBox.first.x)<2,'details cannot change panel X');
    assert.ok(Math.abs(test.y-stableBox.first.y)<2,'details cannot change panel Y');
    assert.ok(Math.abs(test.height-stableBox.first.height)<2,'details cannot resize panel');
  }
  assert.ok(stableBox.scrollHeight>=stableBox.clientHeight,'expanded content scrolls inside panel');
  const quality=await cdp.request('Runtime.evaluate',{
    expression:'(() => {const panel=document.getElementById("panel");' +
      'const close=document.getElementById("close-panel");' +
      'const scroller=document.getElementById("panel-scroll");' +
      'scroller.scrollTop=0;const first=close.getBoundingClientRect();' +
      'const firstCare=panel.querySelector(".objects [data-item]")?.dataset.item;' +
      'const care=panel.querySelector(".objects").getBoundingClientRect();' +
      'const status=panel.querySelector(".needs").getBoundingClientRect();' +
      'scroller.scrollTop=scroller.scrollHeight;const scrolled=close.getBoundingClientRect();' +
      'const outer=panel.getBoundingClientRect();const html=panel.innerHTML;' +
      'const out={first:Math.round(first.top),scrolled:Math.round(scrolled.top),' +
      'inView:scrolled.top>=outer.top-1&&scrolled.bottom<=outer.bottom+1,' +
      'firstCare,careBeforeNeeds:care.top<status.top,scroll:scroller.scrollTop,' +
      'careBeforeClock:panel.querySelector("#hud-care").getBoundingClientRect().top < ' +
      'panel.querySelector("#day-period").getBoundingClientRect().top,' +
      'settingsBelowCare:panel.querySelector("#hud-settings").offsetTop > panel.querySelector("#hud-care").offsetTop,' +
      'monitorInSettings:!!document.querySelector("#desktop-display-settings .monitor-controls"),' +
      'settingsCollapsed:!document.getElementById("desktop-display-settings").open,' +
      'debugControls:["pause","speed","reset"].filter(id=>!!document.getElementById(id))};' +
      'scroller.scrollTop=0;return out;})()',
    returnByValue:true
  });
  const qualityCheck=quality.result?.value;
  console.log('Distribution-ready Windows HUD:',JSON.stringify(qualityCheck));
  assert.equal(qualityCheck.inView,true,'Close X must remain visible while scrolling');
  assert.ok(Math.abs(qualityCheck.first-qualityCheck.scrolled)<2,
    'Close button must stay pinned to the same screen coordinate');
  assert.equal(qualityCheck.firstCare,'feed');
  assert.equal(qualityCheck.careBeforeNeeds,true);
  assert.equal(qualityCheck.careBeforeClock,true,'care actions must be the first major section');
  assert.equal(qualityCheck.settingsBelowCare,true,'settings must be below gameplay');
  assert.equal(qualityCheck.monitorInSettings,true,'monitor selector must be inside bottom settings');
  assert.equal(qualityCheck.settingsCollapsed,true,'advanced monitor settings should start collapsed');
  assert.deepEqual(qualityCheck.debugControls,[]);
  assert.ok(qualityCheck.scroll>0,'HUD scrolling must be exercised');
  const panelShot = await cdp.request('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  const panelPng=Buffer.from(panelShot.data,'base64');
  assert.equal(panelPng.toString('hex',0,8),'89504e470d0a1a0a');
  fs.writeFileSync(path.join(root,'dist','windows-panel-smoke.png'),panelPng);
  // Upgrade scenarios: a named legacy player must never be prompted again,
  // and a previously played baby with no name must keep her progress and
  // receive ONLY the mandatory name screen (no repeated five-step tutorial).
  const legacyNamed=await cdp.request('Runtime.evaluate',{
    expression:'(() => {localStorage.removeItem("baby-on-screen-name-locked-v1");' +
      'return JSON.parse(localStorage.getItem("baby-on-screen-v1")).babyName;})()',
    returnByValue:true
  });
  assert.equal(legacyNamed.result.value,'Estrelinha');
  await cdp.request('Page.reload',{ignoreCache:true});
  await delay(1500);
  const adopted=await cdp.request('Runtime.evaluate',{
    expression:'(() => ({locked:localStorage.getItem("baby-on-screen-name-locked-v1"),' +
      'name:JSON.parse(localStorage.getItem("baby-on-screen-v1")).babyName,' +
      'tourHidden:document.getElementById("welcome-tour").hidden}))()',
    returnByValue:true
  });
  console.log('Legacy named player:',JSON.stringify(adopted.result?.value));
  assert.equal(adopted.result.value.locked,'Estrelinha');
  assert.equal(adopted.result.value.tourHidden,true);
  // beforeunload saves the previous in-memory baby. Inject the legacy
  // unnamed save at document_start of the next load, before renderer.js.
  await cdp.request('Page.addScriptToEvaluateOnNewDocument',{
    source:'(() => {const key="baby-on-screen-v1";' +
      'const save=JSON.parse(localStorage.getItem(key));' +
      'save.babyName="";save.careCount=17;save.xp=124;' +
      'localStorage.setItem(key,JSON.stringify(save));' +
      'localStorage.setItem("baby-on-screen-guide-v1","completed");' +
      'localStorage.removeItem("baby-on-screen-name-locked-v1");})()'
  });
  await cdp.request('Page.reload',{ignoreCache:true});
  await delay(1500);
  const missingName=await cdp.request('Runtime.evaluate',{
    expression:'(() => ({visible:!document.getElementById("welcome-tour").hidden,' +
      'panel:!document.getElementById("panel").hidden,' +
      'title:document.getElementById("welcome-count").textContent,' +
      'field:!document.getElementById("welcome-name-field").hidden,' +
      'care:JSON.parse(localStorage.getItem("baby-on-screen-v1")).careCount,' +
      'xp:JSON.parse(localStorage.getItem("baby-on-screen-v1")).xp}))()',
    returnByValue:true
  });
  console.log('Existing unnamed player:',JSON.stringify(missingName.result?.value));
  assert.equal(missingName.result.value.visible,true);
  assert.equal(missingName.result.value.panel,true);
  assert.equal(missingName.result.value.field,true);
  assert.equal(missingName.result.value.title,'Nome definitivo');
  assert.equal(missingName.result.value.care,17);
  assert.equal(missingName.result.value.xp,124);
  const confirmedLegacy=await cdp.request('Runtime.evaluate',{
    expression:'(() => {const input=document.getElementById("welcome-baby-name");' +
      'input.value="Lia";input.dispatchEvent(new Event("input",{bubbles:true}));' +
      'document.getElementById("welcome-next").click();' +
      'const save=JSON.parse(localStorage.getItem("baby-on-screen-v1"));' +
      'return {name:save.babyName,care:save.careCount,xp:save.xp,' +
      'guideHidden:document.getElementById("welcome-tour").hidden};})()',
    returnByValue:true
  });
  assert.deepEqual(confirmedLegacy.result.value,{
    name:'Lia',care:17,xp:124,guideHidden:true
  });
  console.log('Windows runtime, companion and panel verified.');
}
main().catch(e=>{console.error('Windows runtime smoke failed:',e);process.exitCode=1;})
.finally(()=>{
  try{socket?.close();}catch{}
  if(child?.pid){
    try{execFileSync('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',timeout:15000});}
    catch{try{child.kill();}catch{}}
  }
});
