import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {answerDialogue, startDialogue, DialogueApiError} from '../../api/situations';
import type {DialogueRound, SituationCatalog} from '../../../shared/situations';
import s from "./SituationsGame.module.css";
import {Volume2,VolumeX} from 'lucide-react';
import {useDialogueSpeech} from '../../hooks/useDialogueSpeech';

type Screen = "topics" | "situations" | "chat";
const LETTERS = ["A", "B", "C"];
export default function SituationsGame({data,token,onExit,onPremium}: {data:SituationCatalog;token:string;onExit:()=>void;onPremium:()=>void}) {
  const topics=data.topics;
  const totalSituations=useMemo(()=>topics.reduce((n,t)=>n+t.situations.length,0),[topics]);
  const src=(p:string)=>`/situations-game/${p}`;
  const [screen,setScreen]=useState<Screen>('topics');
  const [ti,setTi]=useState(0),[si,setSi]=useState(0);
  const [round,setRound]=useState<DialogueRound|null>(null);
  const [typing,setTyping]=useState(false),[busy,setBusy]=useState(false);
  const speech=useDialogueSpeech(round,screen==='chat',typing,token);
  const [wrong,setWrong]=useState<string|null>(null);
  const [showUz,setShowUz]=useState(true);
  const [done,setDone]=useState(()=>new Set(data.completed));
  const [stars,setStars]=useState(data.stars);
  const [error,setError]=useState(''),[paywall,setPaywall]=useState(false);
  const lock=useRef(false),generation=useRef(0);
  const pending=useRef<{key:string;id:string}|null>(null);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const clearTimers=useCallback(()=>{if(timer.current)clearTimeout(timer.current);},[]);
  useEffect(()=>()=>{generation.current++;clearTimers();},[clearTimers]);
  const topic=topics[ti],sit=topic.situations[si];
  const finished=round?.finished??false,mistakes=round?.mistakes??0;
  const awaiting=!!round?.question&&!busy&&!typing;
  const msgs=round ? [...round.messages,...(!typing&&round.question?[{from:'partner' as const,ru:round.question.partnerRu,uz:round.question.partnerUz}]:[])] : [];
  const answered=round?.position??0;
  const options=awaiting ? round!.question!.options.map(o=>({orig:o.id,text:o.text})) : [];
  const doneIn=(i:number)=>topics[i].situations.filter(x=>done.has(x.id)).length;
  const openTopic=(i:number)=>{setTi(i);setSi(0);setScreen('situations');setError('');};
  const leaveChat=(to:Screen)=>{speech.stop();generation.current++;clearTimers();setTyping(false);setScreen(to);setError('');setPaywall(false);setWrong(null);};
  const showError=(e:unknown)=>{setError(e instanceof Error?e.message:'Internet aloqasini tekshiring.');if(e instanceof DialogueApiError&&e.status===402)setPaywall(true);};
  const requestId=(key:string)=>{if(pending.current?.key!==key)pending.current={key,id:crypto.randomUUID()};return pending.current.id;};
  const startSituation=async(topicIndex:number,sitIndex:number)=>{
    if(lock.current)return;lock.current=true;setBusy(true);setError('');setPaywall(false);
    speech.stop();clearTimers();const gen=++generation.current;
    const id=topics[topicIndex].situations[sitIndex].id;
    try {
      const next=await startDialogue(token,id,requestId(`start:${id}`));
      pending.current=null;
      if(gen!==generation.current)return;
      setTi(topicIndex);setSi(sitIndex);setRound(next);setWrong(null);setTyping(false);setScreen('chat');
    }catch(e){if(gen===generation.current)showError(e);}
    finally{lock.current=false;setBusy(false);}
  };
  const pick=async(orig:string)=>{
    if(!awaiting||lock.current||!round)return;
    lock.current=true;setBusy(true);setError('');const gen=generation.current;
    try {
      const result=await answerDialogue(token,round.id,round.position,orig,requestId(`${round.id}:${round.position}:${orig}`));
      pending.current=null;if(gen!==generation.current)return;
      setRound(result.round);setWrong(result.correct?null:orig);
      if(result.completed)setDone(new Set(result.completed));
      if(result.totalStars!==undefined)setStars(result.totalStars);
      if(result.correct&&!result.round.finished){setTyping(true);timer.current=setTimeout(()=>setTyping(false),800);}
    }catch(e){if(gen===generation.current)showError(e);}
    finally{lock.current=false;setBusy(false);}
  };
  /* ---------------- render ---------------- */
  return (
    <div className={s.root}>
      {(error || paywall) && <div className={s.errorNotice} role="alert"><p>{error}</p>{paywall && <button type="button" onClick={onPremium}>Premium sotib olish</button>}<button type="button" onClick={()=>{setError('');setPaywall(false);}}>Yopish</button></div>}
      {screen === "topics" && (
        <div className={s.topics}>
          <header className={s.topBar}><button type="button" aria-label="O‘yinlarga qaytish" className={s.iconBtn} onClick={onExit}><BackIcon/></button>
            <div className={s.brand}>
              <span className={s.logo}>F</span>
              <span className={s.brandText}>
                <span className={s.brandName}>FalaRus</span>
                <span className={s.brandSub}>Vaziyatlar oʻyini</span>
              </span>
            </div>
            <div className={s.starPill} aria-label={`${stars} yulduz`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#f59e0b" stroke="#b45309" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
              </svg>
              <span className={s.num}>{stars}</span>
            </div>
          </header>

          <div className={s.heading}>
            <h1 className={s.h1}>Bugun qayerda gaplashamiz?</h1>
            <p className={s.lead}>Выберите место — и поговорите по-русски.</p>
          </div>

          <div className={s.totalCard}>
            <span className={s.trophy} aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" />
                <path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
              </svg>
            </span>
            <span className={s.totalBody}>
              <span className={s.totalRow}>
                <span>Umumiy natija</span>
                <strong className={s.num}>
                  {done.size} / {totalSituations}
                </strong>
              </span>
              <span className={s.totalTrack}>
                <span className={s.totalFill} style={{ width: `${(done.size / totalSituations) * 100}%` }} />
              </span>
            </span>
          </div>

          <div className={s.sectionLabel}>MAVZULAR</div>

          <div className={s.topicGrid}>
            {topics.map((t, i) => {
              const n = doneIn(i);
              return (
                <button key={t.id} type="button" className={s.topicCard} onClick={() => openTopic(i)}>
                  <img src={src(t.scene)} alt="" className={s.topicImg} />
                  <span className={s.topicBody}>
                    <span className={s.topicTitles}>
                      <span className={s.topicRu}>{t.titleRu}</span>
                      <span className={s.topicUz}>{t.titleUz}</span>
                    </span>
                    <span className={s.topicProgress}>
                      <span className={s.track} style={{ background: t.colorSoft }}>
                        <span className={s.fill} style={{ background: t.color, width: `${(n / t.situations.length) * 100}%` }} />
                      </span>
                      <span className={s.num} style={{ color: t.color, fontSize: 12, fontWeight: 700 }}>
                        {n}/{t.situations.length}
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {screen === "situations" && (
        <div className={s.situations}>
          <img src={src(topic.scene)} alt="" className={s.hero} />
          <button type="button" aria-label="Orqaga" className={s.floatingBack} onClick={() => setScreen("topics")}>
            <BackIcon />
          </button>
          <div className={s.sheet}>
            <div className={s.sheetHead}>
              <div className={s.sheetTitles}>
                <span className={s.eyebrow} style={{ color: topic.color }}>
                  {topic.titleUz.toUpperCase()}
                </span>
                <h1 className={s.h1Sm}>{topic.titleRu}</h1>
              </div>
              <span className={s.donePill} style={{ background: topic.colorSoft, color: topic.color }}>
                {doneIn(ti)}/{topic.situations.length} bajarildi
              </span>
            </div>

            <div className={s.sitList}>
              {topic.situations.map((x, i) => {
                const isDone = done.has(x.id);
                return (
                  <button key={x.id} type="button" className={s.sitCard} disabled={busy} onClick={() => void startSituation(ti, i)}>
                    <span className={s.sitIcon} style={{ background: topic.colorSoft }}>
                      <img src={src(x.icon)} alt="" width={36} height={36} />
                    </span>
                    <span className={s.sitBody}>
                      <span className={s.sitRu}>{x.titleRu}</span>
                      <span className={s.sitUz}>{x.titleUz}</span>
                      <span className={s.sitMeta}>
                        <img src={src(x.avatar)} alt="" className={s.miniAvatar} />
                        {x.partnerRu} · {x.steps.length} savol
                      </span>
                    </span>
                    {isDone ? (
                      <span className={s.statusDone} aria-label="Bajarildi">
                        <CheckIcon size={20} />
                      </span>
                    ) : (
                      <span className={s.statusPlay} aria-label="Boshlash">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.4-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5z" />
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {screen === "chat" && (
        <div className={s.chat}>
          <header className={s.chatHeader}>
            <div className={s.chatHeaderRow}>
              <button type="button" aria-label="Orqaga" className={s.iconBtn} onClick={() => leaveChat("situations")}>
                <BackIcon />
              </button>
              <span className={s.avatarWrap}>
                <img src={src(sit.avatar)} alt="" className={s.avatar} />
                <span className={s.online} />
              </span>
              <span className={s.partnerInfo}>
                <span className={s.partnerName}>{sit.partnerRu}</span>
                <span className={s.partnerSub} style={{ color: typing ? "#15803d" : undefined }}>
                  {typing ? "yozmoqda…" : sit.partnerUz}
                </span>
              </span>
              <button
                type="button"
                aria-label="Tarjimani koʻrsatish"
                aria-pressed={showUz}
                className={`${s.uzToggle} ${showUz ? s.uzOn : ""}`}
                onClick={() => setShowUz((v) => !v)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
                </svg>
                UZ
              </button>
              <button type="button" className={s.iconBtn} aria-label={speech.enabled?'Выключить озвучку':'Включить озвучку'} aria-pressed={speech.enabled} onClick={speech.toggle}>
                {speech.enabled?<Volume2 size={21}/>:<VolumeX size={21}/>}
              </button>
            </div>
            <div className={s.segments} style={{ gridTemplateColumns: `repeat(${sit.steps.length}, minmax(0, 1fr))` }}>
              {sit.steps.map((_, i) => (
                <span
                  key={i}
                  className={s.segment}
                  style={{ background: i < answered ? "#22c55e" : i === answered ? "#2563eb" : "#e8eef6" }}
                />
              ))}
            </div>
          </header>

          {/* column-reverse keeps the newest message in view without JS scrolling */}
          <div className={s.feed} aria-live="polite">
            <div className={s.feedInner}>
              <div className={s.sitChip}>
                <span className={s.sitChipIcon} style={{ background: topic.colorSoft }}>
                  <img src={src(sit.icon)} alt="" width={24} height={24} />
                </span>
                <span className={s.sitChipText}>
                  <strong>{sit.titleRu}</strong>
                  <span>{sit.titleUz}</span>
                </span>
              </div>

              {msgs.map((m, i) =>
                m.from === "partner" ? (
                  <div key={i} className={s.rowPartner}>
                    <img src={src(sit.avatar)} alt="" className={s.msgAvatar} />
                    <div className={s.bubblePartner}>
                      <span>{m.ru}</span>
                      {showUz && m.uz && <span className={s.translation}>{m.uz}</span>}
                      <button type="button" className={s.voiceReplay} aria-label={`Прослушать: ${m.ru}`} onClick={()=>speech.repeat(m.ru)}><Volume2 size={17}/> Tinglash</button>
                    </div>
                  </div>
                ) : (
                  <div key={i} className={s.rowMe}>
                    <div className={s.bubbleMe}>{m.ru}<button type="button" className={s.voiceReplay} aria-label={`Прослушать: ${m.ru}`} onClick={()=>speech.repeat(m.ru)}><Volume2 size={17}/> Tinglash</button></div>
                  </div>
                ),
              )}

              {typing && (
                <div className={s.rowPartner}>
                  <img src={src(sit.avatar)} alt="" className={s.msgAvatar} />
                  <div className={s.typing} aria-label="yozmoqda">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={s.answerPanel}>
            {speech.enabled&&speech.blocked&&<p className={s.voiceNotice} role="status">Ovozni eshitish uchun ekranga teging. / Коснитесь экрана, чтобы включить звук.</p>}
            {speech.error&&<p className={s.voiceNotice} role="status">Ovoz yuklanmadi. Xabardagi «Tinglash» tugmasini bosing.</p>}
            {awaiting && !finished ? (
              <div className={s.answers}>
                <div className={s.answersHead}>
                  <span className={s.answersLabel}>JAVOBNI TANLANG</span>
                  <span className={s.answersLabelRu}>Выберите ответ</span>
                </div>
                {options.map((o, k) => {
                  const isWrong = wrong === o.orig;
                  return (
                    <button
                      key={o.orig}
                      type="button"
                      className={`${s.option} ${isWrong ? s.optionWrong : ""}`}
                      onClick={() => pick(o.orig)}
                    >
                      <span className={s.letter}>{LETTERS[k]}</span>
                      <span className={s.optionText}>{o.text}</span>
                      {isWrong && (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                          <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                      )}
                    </button>
                  );
                })}
                {wrong !== null && (
                  <div className={s.wrongNote} role="status">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 8v5M12 16.5v.5" />
                    </svg>
                    Notoʻgʻri. Yana bir bor urinib koʻring.
                  </div>
                )}
              </div>
            ) : (
              <div className={s.waiting}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 5h16v11H8l-4 4z" />
                </svg>
                {busy ? "Saqlanmoqda…" : "Suhbatdosh javob yozmoqda…"}
              </div>
            )}
          </div>

          {finished && (
            <div className={s.overlay}>
              <div className={s.doneSheet} role="dialog" aria-modal="true" aria-label="Vaziyat yakunlandi">
                <Confetti />
                <span className={s.bigCheck}>
                  <CheckIcon size={50} />
                </span>
                <div className={s.doneText}>
                  <h2 className={s.doneTitle}>Молодец!</h2>
                  <p className={s.doneSub}>Ты прошёл эту ситуацию</p>
                  <p className={s.doneUz}>Barakalla! Siz bu vaziyatdan oʻtdingiz.</p>
                </div>
                <div className={s.stats}>
                  <div className={`${s.stat} ${s.statGood}`}>
                    <strong>
                      {answered}/{sit.steps.length}
                    </strong>
                    <span>Toʻgʻri</span>
                  </div>
                  <div className={`${s.stat} ${s.statBad}`}>
                    <strong>{mistakes}</strong>
                    <span>Xato</span>
                  </div>
                  <div className={`${s.stat} ${s.statStar}`}>
                    <strong>{round?.stars} ★</strong>
                    <span>Yulduz · +{round?.earned ?? 0}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className={s.primaryBtn}
                  disabled={busy}
                  onClick={() =>
                    si < topic.situations.length - 1 ? startSituation(ti, si + 1) : leaveChat("topics")
                  }
                >
                  {si < topic.situations.length - 1 ? "Keyingi vaziyat" : "Boshqa mavzuni tanlash"}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
                <button type="button" className={s.ghostBtn} onClick={() => leaveChat("topics")}>
                  Mavzular roʻyxati
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- small icons ---------------- */
function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function CheckIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function Confetti() {
  return (
    <svg className={s.confetti} viewBox="0 0 342 96" aria-hidden="true">
      <rect x="30" y="22" width="10" height="5" rx="2" fill="#2563eb" transform="rotate(30 35 24)" />
      <rect x="72" y="48" width="9" height="4" rx="2" fill="#f59e0b" transform="rotate(-25 76 50)" />
      <circle cx="104" cy="18" r="4" fill="#22c55e" />
      <rect x="250" y="20" width="11" height="5" rx="2" fill="#ef4444" transform="rotate(-35 255 22)" />
      <circle cx="286" cy="50" r="4" fill="#2563eb" />
      <rect x="312" y="28" width="9" height="4" rx="2" fill="#22c55e" transform="rotate(40 316 30)" />
      <circle cx="54" cy="70" r="3" fill="#a855f7" />
      <rect x="226" y="58" width="8" height="4" rx="2" fill="#a855f7" transform="rotate(20 230 60)" />
      <circle cx="140" cy="44" r="3" fill="#ef4444" />
      <circle cx="210" cy="34" r="3" fill="#f59e0b" />
    </svg>
  );
}
