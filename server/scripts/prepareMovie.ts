/** Import privately, then build speech-gated, independently aligned film subtitles. */
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import {command, probe} from '../videoLessons/pipeline.js';
import {LessonStore} from '../videoLessons/store.js';
import {lessonIssues, type VideoLessonDocument, type VideoLessonRecord} from '../../shared/videoLesson.js';

const [input,id,title]=process.argv.slice(2);
if(!input||!id||!title)throw new Error('Usage: prepareMovie.ts video.mp4 UUID title');
const store=new LessonStore();const dir=store.dir(id);
await fs.mkdir(dir,{recursive:true,mode:0o700});
let record:VideoLessonRecord|null=null;
try{record=await store.read(id);}catch(error){if((error as {status?:number}).status!==404)throw error;}
if(record?.status==='published')throw new Error('Use repairMovieSubtitles.ts to prepare a reviewed replacement of a published film.');
const duration=await probe(input),video=path.join(dir,'video.mp4');
if(!await fs.access(video).then(()=>true,()=>false))await command('ffmpeg',['-v','error','-i',input,'-map','0:v:0','-map','0:a:0','-c','copy','-movflags','+faststart',video],10*60_000);
const now=new Date().toISOString();
record??={id,revision:1,status:'draft',phase:'uploaded',filename:path.basename(input),bytes:(await fs.stat(video)).size,duration,mime:'video/mp4',createdAt:now,updatedAt:now,lesson:{kind:'film',id,title,language:'ru',translationLanguage:'uz',video:`/api/video-lessons/${id}/video`,sentences:[]}};
record.phase='recognizing';record.jobOwner=process.pid;record.error=undefined;record.revision++;await store.write(record);
try{
 await command(process.execPath,['--import','tsx','server/scripts/repairMovieSubtitles.ts',id],120*60_000);
 const document=JSON.parse(await fs.readFile(path.join(dir,'subtitles-v3/replacement-lesson.json'),'utf8')) as VideoLessonDocument;
 const issues=lessonIssues(document,duration);if(issues.length)throw new Error(issues.slice(0,8).join('; '));
 record.lesson=document;record.phase='ready';record.revision++;record.jobOwner=undefined;record.updatedAt=new Date().toISOString();await store.write(record);
 console.log(JSON.stringify({id,duration,sentences:document.sentences.length,status:'draft'}));
}catch(error){record.phase='error';record.error=(error as Error).message;record.jobOwner=undefined;record.revision++;await store.write(record);throw error;}
