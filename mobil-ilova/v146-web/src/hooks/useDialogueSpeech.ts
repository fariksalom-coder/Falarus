import {useCallback,useEffect,useRef,useState} from 'react';
import type {DialogueRound} from '../../shared/situations';
import {DialogueTurnPlayback,type DialoguePlaybackView} from '../utils/dialogueTurnPlayback';
import {speakText,stopSpeaking} from '../utils/speak';

export function useDialogueSpeech(token:string){
  const [view,setView]=useState<DialoguePlaybackView>({round:null,phase:'idle',enabled:true,error:false,ready:false,questionVisible:false,finished:false});
  const [blocked,setBlocked]=useState(false);
  const player=useRef<DialogueTurnPlayback|null>(null);
  useEffect(()=>{
    let alive=true;
    const playback=new DialogueTurnPlayback((text,done,fail,voice)=>{
      void speakText(text,{token,ohang:voice,lang:'ru-RU',speed:1,zaxira:false,onEnd:done,onError:fail,onAutoplayBlocked:()=>{if(alive)setBlocked(true);},onStart:()=>{if(alive)setBlocked(false);}});
    },stopSpeaking,next=>{if(alive)setView(next);});
    player.current=playback;
    return()=>{alive=false;playback.stop();player.current=null;};
  },[token]);
  const start=useCallback((round:DialogueRound)=>{setBlocked(false);player.current?.start(round);},[]);
  const accept=useCallback((round:DialogueRound,correct:boolean)=>player.current?.accept(round,correct),[]);
  const stop=useCallback(()=>{setBlocked(false);player.current?.stop();},[]);
  const repeat=useCallback((text:string,from:'partner'|'me')=>{setBlocked(false);player.current?.repeat(text,from);},[]);
  const toggle=useCallback(()=>{setBlocked(false);player.current?.toggle();},[]);
  return {...view,blocked,start,accept,stop,repeat,toggle};
}
