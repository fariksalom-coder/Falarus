import { useNavigate } from 'react-router-dom';
import { Link2, ListChecks, Puzzle } from 'lucide-react';
import { LessonHubLayout } from '../components/lesson/LessonHubLayout';
import { LessonHubTitle } from '../components/lesson/LessonHubTitle';
import { LessonTaskSquareGrid } from '../components/lesson/LessonTaskSquareGrid';
import { useLessonQuestionCounts } from '../context/GrammarCatalogContext';
import { LessonTheoryCollapsible } from '../components/lesson/LessonTheoryCollapsible';
import { LESSONS_LIST_PATH } from '../constants/lessonRoutes';

const LESSON_PATH = '/lesson-1';

const VAZIFA_ITEMS: {
  path: string;
  taskNum: number;
  hint: string;
  Icon: typeof ListChecks;
}[] = [
  { path: '/lesson-1/vazifa/1', taskNum: 1, hint: "To'g'ri javobni tanlang", Icon: ListChecks },
  { path: '/lesson-1/vazifa/2', taskNum: 2, hint: 'Juftini toping', Icon: Link2 },
  { path: '/lesson-1/vazifa/3', taskNum: 3, hint: 'Gapni tuzing', Icon: Puzzle },
];

const TASKS = VAZIFA_ITEMS.map((v) => ({
  path: v.path,
  taskNum: v.taskNum,
  label: `Vazifa ${v.taskNum}`,
  hint: v.hint,
  Icon: v.Icon,
}));

export default function LessonOnePage() {
  const navigate = useNavigate();
  const questionCounts = useLessonQuestionCounts(LESSON_PATH);

  const handleBack = () => {
    if (window.opener && !window.opener.closed) {
      window.opener.focus();
      window.close();
      return;
    }
    navigate(LESSONS_LIST_PATH);
  };

  return (
    <LessonHubLayout onBack={handleBack}>
      <LessonHubTitle lessonPath={LESSON_PATH} />
      <div className="space-y-4">
        <LessonTheoryCollapsible>
          <p className="font-bold">🟢 1. Salomlashish (Приветствие)</p>
          <p>Rus tilida kunning vaqtiga qarab salomlashamiz:</p>
          <p>
            Доброе утро! — Xayrli tong
            <br />
            (ertalab aytiladi)
          </p>
          <p>
            Добрый день! — Xayrli kun
            <br />
            (kun davomida aytiladi)
          </p>
          <p>
            Добрый вечер! — Xayrli kech
            <br />
            (kechqurun aytiladi)
          </p>
          <p>
            Здравствуйте! — Assalomu alaykum
            <br />
            (rasmiy shakl)
          </p>
          <p>
            Привет! — Salom
            <br />
            (norasmiy shakl, do‘stlar uchun)
          </p>

          <p className="font-bold">🔵 2. Xayrlashish (Прощание)</p>
          <p>
            До свидания! — Ko‘rishguncha
            <br />
            (rasmiy xayrlashish)
          </p>
          <p>
            Пока! — Xayr
            <br />
            (norasmiy xayrlashish)
          </p>
          <p>
            Доброй ночи! — Xayrli tun
            <br />
            (uxlashdan oldin aytiladi)
          </p>

          <p className="font-bold">🟣 3. Ism so‘rash (Имя)</p>
          <p>
            Как вас зовут? — Ismingiz nima? (rasmiy)
            <br />
            Как тебя зовут? — Isming nima? (norasmiy)
          </p>
          <p>Меня зовут Али. — Mening ismim Ali.</p>

          <p className="font-bold">🟠 4. Qayerdanligi (Откуда)</p>
          <p>
            Откуда вы? — Siz qayerdansiz?
            <br />
            Откуда ты? — Sen qayerdansan?
          </p>
          <p>
            Я из Узбекистана. — Men O‘zbekistondanman.
            <br />
            Я из Бухары. — Men Buxorodanman.
            <br />
            Я из Самарканда. — Men Samarqanddanman.
          </p>

          <p className="font-bold">🔴 5. Kasbi (Профессия)</p>
          <p>
            Кем вы работаете? — Siz kim bo‘lib ishlaysiz?
            <br />
            Кем ты работаешь? — Sen kim bo‘lib ishlaysan?
          </p>
          <p>
            Я студент. — Men talabaman.
            <br />
            Я водитель. — Men haydovchiman.
            <br />
            Я учитель. — Men o‘qituvchiman.
            <br />
            Он инженер. — U muhandis.
          </p>
        </LessonTheoryCollapsible>

        <LessonTaskSquareGrid
          lessonPath={LESSON_PATH}
          tasks={TASKS}
          sequentialLock
          questionCountByTask={questionCounts}
        />
      </div>
    </LessonHubLayout>
  );
}
