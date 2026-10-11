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
  const until = Date.now() + 45000;
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
      const timeout = setTimeout(() => { pending.delete(id); reject(new Error('CDP method timed out: ' + method)); },15000);
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
    expression:'(() => {const steps=[];for(let i=0;i<4;i++){' +
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
  assert.equal(guide?.steps?.join('|'),'Passo 2 de 5|Passo 3 de 5|Passo 4 de 5|Passo 5 de 5');
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
      'input.value="Luna"; input.dispatchEvent(new Event("input",{bubbles:true}));' +
      'const panel=document.getElementById("panel"); const r=panel.getBoundingClientRect();' +
      'const save=JSON.parse(localStorage.getItem("baby-on-screen-v1"));' +
      'return {open:!panel.hidden,name:save.babyName,label:document.getElementById("desktop-name-label").textContent,' +
      'right:r.right,bottom:r.bottom,width:innerWidth,height:innerHeight};' +
    '})()',
    returnByValue:true
  });
  const p=panelCheck.result?.value;
  console.log('Windows UI panel check:',JSON.stringify(p));
  assert.ok(p?.open && p?.name==='Luna' && p?.label==='Luna');
  assert.ok(p.right<=p.width+2 && p.bottom<=p.height+2, 'The panel must fit on screen');
  const monitorState = await cdp.request('Runtime.evaluate',{
    expression:'(async () => {const info=await window.babyDesktop.desktopLayout();' +
      'const b=info.bounds;const screens=info.displays;' +
      'return {origin:[b.x,b.y],screens:screens.length,screenX:screens[0]?.x,' +
      'hasMonitorPicker:document.getElementById("monitor-select").options.length===screens.length,' +
      'covers:screens.every(d=>d.x>=0&&d.y>=0&&d.x+d.width<=b.width+1&&d.y+d.height<=b.height+1)};})()',
    awaitPromise:true,returnByValue:true
  });
  console.log('Windows monitor geometry:',JSON.stringify(monitorState.result?.value));
  assert.ok(monitorState.result?.value?.screens>=1);
  assert.equal(monitorState.result.value.hasMonitorPicker,true);
  assert.equal(monitorState.result.value.covers,true);
  const gripPosition = await cdp.request('Runtime.evaluate',{
    expression:'(() => {const panel=document.getElementById("panel").getBoundingClientRect();' +
      'const grip=document.getElementById("panel-move-handle").getBoundingClientRect();' +
      'return {left:panel.left,top:panel.top,x:grip.left+grip.width/2,y:grip.top+grip.height/2};})()',
    returnByValue:true
  });
  const grip=gripPosition.result.value;
  const shift=grip.left>110?-95:95;
  await cdp.request('Input.dispatchMouseEvent',{type:'mouseMoved',x:grip.x,y:grip.y});
  await cdp.request('Input.dispatchMouseEvent',{type:'mousePressed',x:grip.x,y:grip.y,button:'left',clickCount:1});
  await cdp.request('Input.dispatchMouseEvent',{type:'mouseMoved',x:grip.x+shift,y:grip.y,button:'left',buttons:1});
  await cdp.request('Input.dispatchMouseEvent',{type:'mouseReleased',x:grip.x+shift,y:grip.y,button:'left',clickCount:1});
  const movedPanel = await cdp.request('Runtime.evaluate',{
    expression:'(() => {const r=document.getElementById("panel").getBoundingClientRect();' +
      'return {x:r.left,y:r.top,stored:localStorage.getItem("baby-on-screen-panel-position-v1")};})()',
    returnByValue:true
  });
  console.log('Windows dragged panel:',JSON.stringify(movedPanel.result?.value));
  assert.ok(Math.abs(movedPanel.result.value.x-grip.left)>25,
    'The panel should be freely draggable across the screen');
  assert.ok(movedPanel.result.value.stored,'The panel position should survive restart');
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
  const panelShot = await cdp.request('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  const panelPng=Buffer.from(panelShot.data,'base64');
  assert.equal(panelPng.toString('hex',0,8),'89504e470d0a1a0a');
  fs.writeFileSync(path.join(root,'dist','windows-panel-smoke.png'),panelPng);
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
