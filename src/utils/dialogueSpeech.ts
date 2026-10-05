/** Sequential playback prevents answer and partner voices from overlapping. */
export function splitDialogueSpeech(text: string): string[] {
  let rest=text.trim().replace(/\s+/g,' ');const chunks:string[]=[];
  while(rest.length>200){
    const prefix=rest.slice(0,201);let cut=prefix.lastIndexOf(' ',200);
    if(cut<1)cut=200;
    chunks.push(rest.slice(0,cut));rest=rest.slice(cut).trimStart();
  }
  if(rest)chunks.push(rest);return chunks;
}
export type DialogueSpeaker = (text:string,done:()=>void,fail:()=>void)=>void;
export class DialogueSpeechQueue {
  private pending:string[]=[];private playing=false;private version=0;
  constructor(private speak:DialogueSpeaker,private stop:()=>void,private onError:()=>void){}
  enqueue(text:string){this.pending.push(...splitDialogueSpeech(text));this.next();}
  clear(){this.version++;this.pending=[];this.playing=false;this.stop();}
  private next(){
    if(this.playing||!this.pending.length)return;
    const text=this.pending.shift()!;this.playing=true;const version=this.version;let settled=false;
    const finish=(failed:boolean)=>{
      if(settled||version!==this.version)return;settled=true;this.playing=false;
      if(failed)this.onError();this.next();
    };
    this.speak(text,()=>finish(false),()=>finish(true));
  }
}
