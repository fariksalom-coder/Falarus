import {useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
import {fetchDialogueCatalog} from '../api/situations';
import type {SituationCatalog} from '../../shared/situations';
import SituationsGame from '../components/SituationsGame/SituationsGame';

export default function SituationsGamePage() {
  const {token}=useAuth(); const navigate=useNavigate();
  const [data,setData]=useState<SituationCatalog|null>(null); const [error,setError]=useState(''); const [retry,setRetry]=useState(0);
  useEffect(()=>{
    if(!token){navigate('/login',{replace:true,state:{from:'/games/dialogue'}});return;}
    let alive=true;setError('');setData(null);
    fetchDialogueCatalog(token).then(d=>{if(alive)setData(d);}).catch(e=>{if(alive)setError(e.message);});
    return()=>{alive=false;};
  },[token,navigate,retry]);
  if(!token)return null;
  if(!data||!data.topics.length)return <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-app-bg p-6 text-app-text"><p role="status">{error|| (data?'Vaziyatlar hali tayyorlanmagan.':'Yuklanmoqda…')}</p>{error&&<button onClick={()=>setRetry(n=>n+1)}>Qayta urinish</button>}<button onClick={()=>navigate('/games')}>O‘yinlarga qaytish</button></div>;
  return <SituationsGame key={token} token={token} data={data} onExit={()=>navigate('/games')} onPremium={()=>navigate('/kurs-haqida')}/>;
}
