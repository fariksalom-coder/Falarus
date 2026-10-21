"""Speech windows and local forced alignment of complete Russian film captions."""
import argparse, json, os
from pathlib import Path
ROOT = Path.home() / 'whisperx'
os.environ.update(HF_HOME=str(ROOT/'cache/huggingface'), HF_HUB_DISABLE_IMPLICIT_TOKEN='1', HF_HUB_DISABLE_TELEMETRY='1', NLTK_DATA=str(ROOT/'cache/nltk'), TORCH_HOME=str(ROOT/'cache/torch'), OMP_NUM_THREADS='2', MKL_NUM_THREADS='2')
p = argparse.ArgumentParser()
p.add_argument('video'); p.add_argument('directory')
a = p.parse_args(); directory = Path(a.directory); directory.mkdir(parents=True, exist_ok=True)

def save(name, value):
    temporary = directory / (name + '.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False))
    temporary.replace(directory / name)

def progress(stage, percent):
    save('progress.json', {'stage': stage, 'percent': round(percent, 1)})

from faster_whisper.audio import decode_audio
from faster_whisper.vad import get_speech_timestamps, VadOptions
progress('Определяем короткие речевые фрагменты', 0)
cache_audio=directory.parent / 'subtitles-v2' / 'audio.npy'
if cache_audio.exists():
    import numpy as np
    audio=np.load(cache_audio, mmap_mode='r')
else:
    audio=decode_audio(a.video, sampling_rate=16000)
speech=get_speech_timestamps(audio,VadOptions(threshold=.6,min_speech_duration_ms=180,max_speech_duration_s=6,min_silence_duration_ms=400,speech_pad_ms=200))
windows=[]
for item in speech:
    start,end=item['start']/16000,item['end']/16000
    if windows and start-windows[-1]['end']<=.35 and end-windows[-1]['start']<=6.5:
        windows[-1]['end']=end
    else:
        start=max(start,windows[-1]['end'] if windows else 0)
        if end>start:windows.append({'start':round(start,3),'end':round(end,3)})
save('speech-windows.json',windows)
progress('Короткие фрагменты готовы',5)
print(json.dumps({'windows':len(windows),'speech_seconds':sum(w['end']-w['start'] for w in windows)}),flush=True)
