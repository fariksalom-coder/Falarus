import {useEffect,useRef} from 'react';
/** A fixed viewport: move only the map world, never the document. */
export function useMapPan(scene: number|null, loaded:boolean){
 const viewport=useRef<HTMLDivElement>(null),world=useRef<HTMLDivElement>(null),position=useRef(0);
 const moveTo=(next:number)=>{const view=viewport.current,track=world.current;if(!view||!track)return;position.current=Math.max(0,Math.min(next,Math.max(0,track.scrollHeight-view.clientHeight)));track.style.transform=`translate3d(0,${-position.current}px,0)`;view.scrollTop=0;};
 useEffect(()=>{
  const view=viewport.current,track=world.current;if(!view||!track)return;
  let startY=0,startPosition=0,activePointer:number|null=null,dragged=false,clearClick:ReturnType<typeof setTimeout>|undefined;
  const wheel=(e:WheelEvent)=>{if(e.ctrlKey)return;e.preventDefault();moveTo(position.current+e.deltaY*(e.deltaMode===1?18:e.deltaMode===2?view.clientHeight:1));};
  const down=(e:PointerEvent)=>{if(e.button!==0||!e.isPrimary)return;activePointer=e.pointerId;startY=e.clientY;startPosition=position.current;dragged=false;};
  const move=(e:PointerEvent)=>{if(e.pointerId!==activePointer)return;const delta=startY-e.clientY;if(!dragged&&Math.abs(delta)<7)return;dragged=true;view.setPointerCapture(e.pointerId);view.classList.add('is-panning');e.preventDefault();moveTo(startPosition+delta);};
  const up=(e:PointerEvent)=>{if(e.pointerId!==activePointer)return;activePointer=null;view.classList.remove('is-panning');if(view.hasPointerCapture(e.pointerId))view.releasePointerCapture(e.pointerId);clearClick=setTimeout(()=>{dragged=false;},0);};
  const click=(e:MouseEvent)=>{if(dragged){e.preventDefault();e.stopPropagation();}};
  const key=(e:KeyboardEvent)=>{const steps:Record<string,number>={ArrowDown:90,ArrowUp:-90,PageDown:view.clientHeight*.8,PageUp:-view.clientHeight*.8};if(e.key in steps){e.preventDefault();moveTo(position.current+steps[e.key]);}else if(e.key==='Home'||e.key==='End'){e.preventDefault();moveTo(e.key==='Home'?0:track.scrollHeight);}};
  const focus=(e:FocusEvent)=>{const el=e.target as HTMLElement;if(el===view)return;const box=el.getBoundingClientRect(),bounds=view.getBoundingClientRect();if(box.top<bounds.top+12||box.bottom>bounds.bottom-12)moveTo(position.current+box.top-bounds.top-view.clientHeight/2+box.height/2);};
  const resize=new ResizeObserver(()=>moveTo(position.current));resize.observe(view);resize.observe(track);
  view.addEventListener('wheel',wheel,{passive:false});view.addEventListener('pointerdown',down);view.addEventListener('pointermove',move,{passive:false});view.addEventListener('pointerup',up);view.addEventListener('pointercancel',up);view.addEventListener('click',click,true);view.addEventListener('keydown',key);view.addEventListener('focusin',focus);
  return()=>{clearTimeout(clearClick);resize.disconnect();view.removeEventListener('wheel',wheel);view.removeEventListener('pointerdown',down);view.removeEventListener('pointermove',move);view.removeEventListener('pointerup',up);view.removeEventListener('pointercancel',up);view.removeEventListener('click',click,true);view.removeEventListener('keydown',key);view.removeEventListener('focusin',focus);};
 },[scene,loaded]);
 return {viewport,world,position,moveTo};
}
