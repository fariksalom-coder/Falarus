import type { VideoSentence } from '../../shared/videoLesson.js';

type TimedWord = {word:string;start:number;end:number};
const normalized=(text:string)=>text.toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const round=(value:number)=>Math.round(value*1000)/1000;

/** Match measured speech timestamps back to the authoritative transcript without deleting its words. */
export function alignFilmCaptions(text:string,heard:TimedWord[],start:number,end:number) {
  const source=text.match(/\S+/gu)??[];
  const words=heard.filter(w=>Number.isFinite(w.start)&&Number.isFinite(w.end)&&w.end>w.start);
  if(!source.length)return {sentences:[] as VideoSentence[],exactRatio:1,estimated:false};
  if(!words.length)return {sentences:[{text:text.trim(),translation:'',start,end,words:[]}],exactRatio:0,estimated:true};
  const n=source.length,m=words.length;
  const costs=Array.from({length:n+1},()=>new Int32Array(m+1));
  for(let i=0;i<=n;i++)costs[i][0]=i*2;
  for(let j=0;j<=m;j++)costs[0][j]=j*2;
  const same=(i:number,j:number)=>Boolean(normalized(source[i]))&&normalized(source[i])===normalized(words[j].word);
  for(let i=1;i<=n;i++)for(let j=1;j<=m;j++)costs[i][j]=Math.min(costs[i-1][j-1]+(same(i-1,j-1)?0:3),costs[i-1][j]+2,costs[i][j-1]+2);
  const matched:(TimedWord|undefined)[]=new Array(n);
  let i=n,j=m,exact=0;
  while(i||j){
    if(i&&j&&costs[i][j]===costs[i-1][j-1]+(same(i-1,j-1)?0:3)){matched[i-1]=words[j-1];if(same(i-1,j-1))exact++;i--;j--;}
    else if(i&&costs[i][j]===costs[i-1][j]+2)i--;else j--;
  }
  const sentences:VideoSentence[]=[];let from=0,previous=start;
  for(let to=0;to<n;to++){
    if(to<n-1&&!/[.!?…][»”"')\]]*$/.test(source[to]))continue;
    const before=matched.slice(0,from).filter((w):w is TimedWord=>Boolean(w)).at(-1);
    const after=matched.slice(to+1).find(Boolean);
    const begin=round(Math.max(previous,matched[from]?.start??before?.end??start));
    const finish=round(Math.min(end,matched[to]?.end??after?.start??end));
    const phrase=source.slice(from,to+1).join(' ');
    if(finish>begin){sentences.push({text:phrase,translation:'',start:begin,end:finish,words:[]});previous=finish;}
    else if(sentences.length){sentences.at(-1)!.text+=' '+phrase;}
    else {from=0;continue;}
    from=to+1;
  }
  return {sentences,exactRatio:exact/source.filter(s=>normalized(s)).length,estimated:false};
}
