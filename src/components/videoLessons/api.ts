import { apiUrl } from '../../api';
import { getAdminToken } from '../../lib/adminApi';
import type { VideoLessonRecord } from '../../../shared/videoLesson';
export function uploadLessonVideo(file: File, onProgress: (percent: number) => void): Promise<VideoLessonRecord> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest(); xhr.open('POST', apiUrl('/api/admin/video-lessons/upload')); xhr.timeout = 10 * 60 * 1000;
    xhr.setRequestHeader('Authorization', `Bearer ${getAdminToken() || ''}`);
    xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100)); };
    xhr.onerror = () => reject(new Error('Загрузка прервана. Проверьте соединение.'));
    xhr.ontimeout = () => reject(new Error('Загрузка заняла больше 10 минут. Попробуйте ещё раз.'));
    xhr.onload = () => { let data; try { data = JSON.parse(xhr.responseText); } catch { reject(new Error(`Не удалось загрузить видео (HTTP ${xhr.status}).`)); return; } if (xhr.status >= 200 && xhr.status < 300) resolve(data); else reject(new Error(data.error || `Ошибка загрузки: ${xhr.status}`)); };
    const body = new FormData(); body.append('video', file); xhr.send(body);
  });
}
