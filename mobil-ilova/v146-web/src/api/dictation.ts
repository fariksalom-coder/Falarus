import {apiUrl} from '../api';
export async function dictationApi<T>(token:string,url:string,body?:unknown):Promise<T>{
 const response=await fetch(apiUrl('/api/games/dictation'+url),{method:body===undefined?'GET':'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await response.json();if(!response.ok)throw Error(data.error||'Не удалось загрузить игру.');return data;
}
