/* Optional visual sprite overlay, activated only when a valid PNG and frame map exist. */
(function(global){
"use strict";
function attachBabySprites({baby,canvas,manifest,base=".."}){
 if(!baby||!canvas||!global.BabySpriteController||!global.BabySpriteRuntime)return null;
 const controller=new global.BabySpriteController(canvas,{base});
 let current="",ready=false;
 const allowed=new Set(["up","down","left","right"]);
 async function show({stage="newborn",direction="down",action="idle"}={}){
  if(!allowed.has(direction))direction="down";
  const entry=manifest?.[stage]?.[action]?.[direction]||manifest?.[stage]?.idle?.down;
  if(!entry){hide();return false;}
  const key=[stage,direction,action,entry.category,entry.filename].join(":");
  if(key===current&&ready)return true;
  current=key;ready=false;
  const success=await controller.play(entry.category,entry.filename,entry.frames,{fps:entry.fps||6,loop:entry.loop!==false});
  if(current!==key)return false;
  ready=success;
  canvas.hidden=!success;
  baby.classList.toggle("sprite-ready",success);
  return success;
 }
 function hide(){current="";ready=false;controller.stop();canvas.hidden=true;baby.classList.remove("sprite-ready");}
 function destroy(){hide();controller.destroy();}
 hide();return {show,hide,destroy};
}
global.BabySpriteIntegration=Object.freeze({attachBabySprites});
})(typeof window!=="undefined"?window:globalThis);
