import { useNavigate } from 'react-router-dom';

export default function LessonOnePage() {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.opener && !window.opener.closed) {
      window.opener.focus();
      window.close();
      return;
    }
    navigate('/');
  };

  const openGreetingTest = () => {
    navigate('/lesson-1/bitta-mashq');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-3xl mx-auto p-6">
        <div className="bg-white rounded-2xl border-2 border-slate-100 p-5">
          <button
            type="button"
            onClick={handleBack}
            className="mb-4 inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Orqaga
          </button>
          <h1 className="text-xl font-bold text-slate-900 mb-4">1-dars</h1>
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-800 space-y-4 text-sm leading-relaxed">
              <p className="font-bold">🟢 1. Salomlashish (Приветствие)</p>
              <p>Rus tilida kunning vaqtiga qarab salomlashamiz:</p>
              <p>Доброе утро! — Xayrli tong<br />(ertalab aytiladi)</p>
              <p>Добрый день! — Xayrli kun<br />(kun davomida aytiladi)</p>
              <p>Добрый вечер! — Xayrli kech<br />(kechqurun aytiladi)</p>
              <p>Здравствуйте! — Assalomu alaykum<br />(rasmiy shakl)</p>
              <p>Привет! — Salom<br />(norasmiy shakl, do‘stlar uchun)</p>

              <p className="font-bold">🔵 2. Xayrlashish (Прощание)</p>
              <p>До свидания! — Ko‘rishguncha<br />(rasmiy xayrlashish)</p>
              <p>Пока! — Xayr<br />(norasmiy xayrlashish)</p>
              <p>Доброй ночи! — Xayrli tun<br />(uxlashdan oldin aytiladi)</p>

              <p className="font-bold">🟣 3. Ism so‘rash (Имя)</p>
              <p>Как вас зовут? — Ismingiz nima? (rasmiy)<br />Как тебя зовут? — Isming nima? (norasmiy)</p>
              <p>Меня зовут Али. — Mening ismim Ali.</p>

              <p className="font-bold">🟠 4. Qayerdanligi (Откуда)</p>
              <p>Откуда вы? — Siz qayerdansiz?<br />Откуда ты? — Sen qayerdansan?</p>
              <p>Я из Узбекистана. — Men O‘zbekistondanman.<br />Я из Бухары. — Men Buxorodanman.<br />Я из Самарканда. — Men Samarqanddanman.</p>

              <p className="font-bold">🔴 5. Kasbi (Профессия)</p>
              <p>Кем вы работаете? — Siz kim bo‘lib ishlaysiz?<br />Кем ты работаешь? — Sen kim bo‘lib ishlaysan?</p>
              <p>Я студент. — Men talabaman.<br />Я водитель. — Men haydovchiman.<br />Я учитель. — Men o‘qituvchiman.<br />Он инженер. — U muhandis.</p>
            </div>
            <button
              type="button"
              onClick={openGreetingTest}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-white font-semibold hover:bg-indigo-700 transition-colors active:scale-[0.99]"
            >
              Topshiriq
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
