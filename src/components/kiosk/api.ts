import { apiUrl } from '../../api';
import type { KioskConfig, KioskSession } from '../../../shared/kiosk';
export class KioskApiError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function kioskRequest<T>(path: string, token?: string, body?: unknown): Promise<T> {
  const response = await fetch(apiUrl(`/api/kiosk${path}`), {
    method:body===undefined?'GET':'POST',
    headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},
    body:body===undefined?undefined:JSON.stringify(body),
  });
  const data=await response.json().catch(()=>({error:'Не удалось связаться с сервером. / Serverga ulanib bo‘lmadi.'}));
  if (!response.ok) throw new KioskApiError(data.error??'Попробуйте ещё раз. / Qayta urinib ko‘ring.',response.status);
  return data;
}
export const kioskApi = {
  config:()=>kioskRequest<KioskConfig>('/config'),
  session:(token:string)=>kioskRequest<KioskSession>('/session',token),
  start:(token:string,body:unknown)=>kioskRequest<KioskSession>('/sessions',token,body),
  answer:(token:string,index:number,selected:number|null)=>kioskRequest<KioskSession>('/answer',token,{index,selected}),
};
