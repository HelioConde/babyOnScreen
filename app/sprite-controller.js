/* Opt-in adapter for imported generated sprites.
   Leaves current CSS baby rendering intact until a verified animation map is provided. */
(function(global){
"use strict";
const Runtime=global.BabySpriteRuntime;
if(!Runtime)return;
const ACTIONS=Object.freeze({feed:"alimentacao",sleep:"sono",diaper:"fralda",toy:"crescimento",school:"escola"});
function makeImage(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error("Sprite unavailable: "+src));img.src=src;});}
class BabySpriteController{
 constructor(canvas,{base="",fps=6}={}){if(!(canvas instanceof HTMLCanvasElement))throw Error("Canvas required");this.canvas=canvas;this.ctx=canvas.getContext("2d");this.base=base;this.fps=fps;this.animator=null;this.active=false;this.last=0;this.raf=0;this.generation=0;this.tick=this.tick.bind(this);}
 async play(category,filename,frames,options={}){const id=++this.generation;const url=Runtime.spriteUrl(category,filename,this.base);let img;try{img=await makeImage(url);}catch(e){if(id===this.generation)this.stop();return false;}
  if(id!==this.generation)return false;
  this.animator=new Runtime.SpriteAnimator(img,frames,{fps:options.fps||this.fps,loop:options.loop!==false,onFinish:options.onFinish});
  this.active=true;this.last=0;cancelAnimationFrame(this.raf);this.raf=requestAnimationFrame(this.tick);return true;
 }
 tick(now){if(!this.active||!this.animator)return;const dt=this.last?(now-this.last)/1000:0;this.last=now;this.animator.update(dt);
  this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);this.animator.draw(this.ctx,this.canvas.width/2,this.canvas.height,{scale:1});this.raf=requestAnimationFrame(this.tick);
 }
 stop(){this.generation++;this.active=false;cancelAnimationFrame(this.raf);this.animator=null;this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);}
 destroy(){this.stop();}
}
global.BabySpriteController=BabySpriteController;
global.BabySpriteActionCategories=ACTIONS;
})(typeof window!=="undefined"?window:globalThis);
