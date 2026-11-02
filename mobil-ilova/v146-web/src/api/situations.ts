import {apiUrl} from '../api';
import type {DialogueRound, DialogueAnswer, SituationCatalog} from '../../shared/situations';
export class DialogueApiError extends Error {constructor(public status:number,message:string){super(message);}}
async function request<T>(token:string,path:string,body?:unknown):Promise<T> {
  const response=await fetch(apiUrl(`/api/games/dialogue${path}`),{method:body?'POST':'GET',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json();
  if(!response.ok)throw new DialogueApiError(response.status,data.error||'Suhbat yuklanmadi.');
  return data;
}
export const fetchDialogueCatalog=(token:string)=>request<SituationCatalog>(token,'/catalog');
export const startDialogue=(token:string,situationId:string,requestId:string)=>request<DialogueRound>(token,'/sessions',{situationId,requestId});
export const answerDialogue=(token:string,id:string,position:number,optionId:string,requestId:string)=>request<DialogueAnswer>(token,`/sessions/${id}/answer`,{position,optionId,requestId});
