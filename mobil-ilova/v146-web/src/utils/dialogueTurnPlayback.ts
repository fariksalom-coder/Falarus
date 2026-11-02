import type {DialogueRound} from '../../shared/situations';
import {DialogueSpeechQueue,type DialogueSpeaker} from './dialogueSpeech';

export type DialoguePhase='idle'|'partner'|'choices'|'answer'|'replay'|'finished';
export interface DialoguePlaybackView {
  round:DialogueRound|null;phase:DialoguePhase;enabled:boolean;error:boolean;
  ready:boolean;questionVisible:boolean;finished:boolean;
}
/** The same audio completion event controls both message visibility and choices. */
export class DialogueTurnPlayback {
  private round:DialogueRound|null=null;
  private phase:DialoguePhase='idle';private enabled=true;private error=false;
  private queue:DialogueSpeechQueue;
  constructor(speak:DialogueSpeaker,stop:()=>void,private notify:(view:DialoguePlaybackView)=>void){
    this.queue=new DialogueSpeechQueue(speak,stop,()=>{this.error=true;this.emit();});
  }
  get view():DialoguePlaybackView {
    return {round:this.round,phase:this.phase,enabled:this.enabled,error:this.error,
      ready:this.phase==='choices',questionVisible:this.phase==='partner'||this.phase==='choices'||this.phase==='replay',finished:this.phase==='finished'};
  }
  private emit(){this.notify(this.view);}
  start(round:DialogueRound){this.queue.clear();this.round=round;this.error=false;this.partner();}
  accept(round:DialogueRound,correct:boolean){
    if(!this.round||this.round.id!==round.id)return;
    if(round.position!==this.round.position+(correct?1:0)){
      // An idempotent response can contain newer progress from another tab.
      if(round.position>this.round.position)this.start(round);
      return;
    }
    if(!correct){this.round=round;this.emit();return;}
    this.queue.clear();this.round=round;this.error=false;this.phase='answer';this.emit();
    const reply=round.messages.at(-1);
    if(!this.enabled||!reply||reply.from!=='me'){this.partner();return;}
    this.queue.enqueue(reply.ru,'dialogue-male',()=>this.partner());
  }
  private partner(){
    if(!this.round)return;
    if(this.round.finished){this.phase='finished';this.emit();return;}
    this.phase=this.enabled?'partner':'choices';this.emit();
    if(this.enabled&&this.round.question){
      this.queue.enqueue(this.round.question.partnerRu,'dialogue-female',()=>{this.phase='choices';this.emit();});
    }
  }
  repeat(text:string,from:'partner'|'me'){
    if(!this.view.ready)return;
    this.queue.clear();this.enabled=true;this.error=false;this.phase='replay';this.emit();
    this.queue.enqueue(text,from==='me'?'dialogue-male':'dialogue-female',()=>{this.phase='choices';this.emit();});
  }
  toggle(){
    const previous=this.phase;this.queue.clear();this.enabled=!this.enabled;this.error=false;
    if(previous==='idle'||previous==='finished'){this.emit();return;}
    this.partner();
  }
  stop(){this.queue.clear();this.round=null;this.phase='idle';this.error=false;this.emit();}
}
