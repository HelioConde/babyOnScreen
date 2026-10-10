/* Sprite runtime: safe opt-in. Never assumes generated frames exist. */
(function(global){
"use strict";
const CATEGORIES=new Set(["banho","fralda","alimentacao","sono","crescimento","quarto","casa","quintal","escola","npcs"]);
const ROOT="assets/sprites/generated";
function cleanPart(s){if(typeof s!=="string"||!/^[a-z0-9_-]+$/i.test(s))throw Error("Invalid sprite identifier");return s;}
function spriteUrl(category,filename,base=""){
 if(!CATEGORIES.has(category))throw Error("Unknown sprite category");
 if(!/^element_\d{3}\.png$|^sheet\.png$/.test(filename))throw Error("Invalid sprite filename");
 return [base.replace(/\/$/,""),ROOT,category,filename].filter(Boolean).join("/");
}
class SpriteAnimator{
 constructor(image,frames,{fps=6,loop=true,onFinish=null}={}){
  if(!image||!Array.isArray(frames)||!frames.length)throw Error("Image and frames required");
  this.image=image;this.frames=frames;this.fps=Math.max(1,Math.min(60,Number(fps)||6));this.loop=loop;this.onFinish=onFinish;this.elapsed=0;this.index=0;this.finished=false;
 }
 reset(){this.elapsed=0;this.index=0;this.finished=false;}
 update(dt){if(this.finished)return;this.elapsed+=Math.max(0,Math.min(Number(dt)||0,0.25));const frameTime=1/this.fps;
  while(this.elapsed>=frameTime){this.elapsed-=frameTime;if(this.index+1<this.frames.length)this.index++;else if(this.loop)this.index=0;else{this.finished=true;this.elapsed=0;if(this.onFinish)this.onFinish();break;}}
 }
 draw(ctx,x,y,{scale=1,flipX=false}={}){const f=this.frames[this.index];if(!f)return;const sx=f.x||0,sy=f.y||0,w=f.w||this.image.width,h=f.h||this.image.height;
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(flipX?-scale:scale,scale);ctx.drawImage(this.image,sx,sy,w,h,-Math.round((f.pivotX??w/2)), -Math.round((f.pivotY??h)),w,h);ctx.restore();
 }
}
function validateAnimation(data){if(!data||typeof data!=="object")throw Error("Invalid animation");
 const valid=new Set(["up","down","left","right"]);for(const [direction,frames] of Object.entries(data)){if(!valid.has(direction)||!Array.isArray(frames))throw Error("Invalid direction frames");}
 return data;
}
global.BabySpriteRuntime=Object.freeze({spriteUrl,SpriteAnimator,validateAnimation,categories:[...CATEGORIES]});
})(typeof window!=="undefined"?window:globalThis);
