"""CPU-only WhisperX preparation. No diarization, no speaker models, no token."""
import argparse, gc, json, os
from pathlib import Path
ROOT = Path.home() / 'whisperx'
os.environ.update(HF_HOME=str(ROOT/'cache/huggingface'), HF_HUB_DISABLE_IMPLICIT_TOKEN='1', HF_HUB_DISABLE_TELEMETRY='1', NLTK_DATA=str(ROOT/'cache/nltk'), TORCH_HOME=str(ROOT/'cache/torch'), OMP_NUM_THREADS='2', MKL_NUM_THREADS='2')
parser = argparse.ArgumentParser()
parser.add_argument('video'); parser.add_argument('--output', required=True); parser.add_argument('--transcript')
args = parser.parse_args()
import torch, whisperx
torch.set_num_threads(2); torch.set_num_interop_threads(1)
progress_path = Path(args.output).with_name('progress.json')
def progress(stage, percent):
    temporary = progress_path.with_suffix('.tmp')
    temporary.write_text(json.dumps({'stage': stage, 'percent': round(percent, 1)}, ensure_ascii=False))
    temporary.replace(progress_path)
progress('Загрузка аудио', 0)
audio = whisperx.load_audio(args.video)
if args.transcript:
    segments = json.loads(Path(args.transcript).read_text())
else:
    progress('Загрузка модели распознавания', 0)
    model = whisperx.load_model('small', 'cpu', compute_type='int8', language='ru', vad_method='silero', threads=2, download_root=str(ROOT/'cache/whisper'))
    segments = model.transcribe(audio, batch_size=1, language='ru', progress_callback=lambda p: progress('Распознавание речи', p))['segments']
    del model; gc.collect()
progress('Загрузка модели привязки слов', 0)
aligner, metadata = whisperx.load_align_model(language_code='ru', device='cpu', model_dir=str(ROOT/'cache/alignment'))
result = whisperx.align(segments, aligner, metadata, audio, 'cpu', return_char_alignments=False, progress_callback=lambda p: progress('Привязка слов', p))
output = Path(args.output); temporary = output.with_suffix('.tmp')
temporary.write_text(json.dumps(result, ensure_ascii=False, indent=2)); temporary.replace(output)
