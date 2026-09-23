/** Pure CSS scene; independent of item contents and audio, no media downloads. */
export default function GameBackground({background_id='city'}:{background_id?:string}){
 const scene=['city','transport','construction','shop','home'].includes(background_id)?background_id:'city';
 return <div className={`dt-scene dt-scene-${scene}`} aria-hidden="true"><span className="dt-sun"/><span className="dt-cloud cloud-a"/><span className="dt-cloud cloud-b"/><div className="dt-buildings"><i/><i/><i/><i/><i/></div><span className="dt-road"/><span className="dt-traveller">{scene==='construction'?'🚚':scene==='shop'?'🛒':scene==='home'?'🚶':'🚌'}</span></div>;
}
