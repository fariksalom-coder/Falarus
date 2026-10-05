import {useCallback,useEffect,useRef,useState} from 'react';
import type {DialogueRound} from '../../shared/situations';
import {DialogueSpeechQueue} from '../utils/dialogueSpeech';
import {speakText,stopSpeaking} from '../utils/speak';

export function useDialogueSpeech(round:DialogueRound|null,active:boolean,typing:boolean,token:string){
  const [enabled,setEnabled]=useState(true),[error,setError]=useState(false);
  const [blocked,setBlocked]=useState(false);
  const queue=useRef<DialogueSpeechQueue|null>(null);
  const seen=useRef({session:'',messages:0,question:-1});
  useEffect(()=>{
    const player=new DialogueSpeechQueue((text,done,fail)=>{
      void speakText(text,{token,lang:'ru-RU',speed:1,zaxira:false,onEnd:done,onError:fail,onAutoplayBlocked:()=>setBlocked(true),onStart:()=>setBlocked(false)});
    },stopSpeaking,()=>setError(true));
    queue.current=player;
    return()=>{player.clear();queue.current=null;};
  },[token]);
  useEffect(()=>{
    if(!active||!enabled||!round){queue.current?.clear();seen.current={session:'',messages:0,question:-1};return;}
    const previous=seen.current;
    if(previous.session!==round.id){
      queue.current?.clear();previous.session=round.id;previous.messages=round.messages.length;previous.question=-1;setError(false);
    }
    for(const message of round.messages.slice(previous.messages)){
      if(message.from==='me')queue.current?.enqueue(message.ru);
    }
    previous.messages=round.messages.length;
    if(!typing&&round.question&&previous.question!==round.position){
      previous.question=round.position;queue.current?.enqueue(round.question.partnerRu);
    }
  },[round,active,typing,enabled]);
  const stop=useCallback(()=>queue.current?.clear(),[]);
  const repeat=useCallback((text:string)=>{
    if(round)seen.current={session:round.id,messages:round.messages.length,question:!typing&&round.question?round.position:-1};
    setEnabled(true);setError(false);queue.current?.clear();queue.current?.enqueue(text);
  },[round,typing]);
  return {enabled,error,blocked,stop,repeat,toggle:()=>{queue.current?.clear();setEnabled(v=>!v);setError(false);setBlocked(false);}};
}
