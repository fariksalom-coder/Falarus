import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { 
  ChevronLeft, 
  Plus, 
  Volume2, 
  Search,
  BookMarked,
  Trash2
} from 'lucide-react';

export default function VocabularyPage() {
  const { token } = useAuth();
  const [words, setWords] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newWord, setNewWord] = useState({ word_ru: '', translation_uz: '', example_ru: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/vocabulary', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setWords(data));
  }, [token]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/vocabulary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(newWord),
    });
    if (res.ok) {
      setWords([...words, { ...newWord, id: Date.now() }]);
      setShowAdd(false);
      setNewWord({ word_ru: '', translation_uz: '', example_ru: '' });
    }
  };

  const filteredWords = words.filter(w => 
    w.word_ru.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.translation_uz.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ChevronLeft className="w-6 h-6 text-slate-600" />
        </button>
        <h1 className="font-bold text-xl text-slate-900 flex-1">Shaxsiy lug‘at</h1>
        <button 
          onClick={() => setShowAdd(true)}
          className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-6 h-6" />
        </button>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="So‘zlarni qidirish..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Word List */}
        <div className="space-y-4">
          {filteredWords.length === 0 ? (
            <div className="text-center py-20">
              <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookMarked className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500">Hozircha so‘zlar yo‘q.</p>
            </div>
          ) : (
            filteredWords.map((word) => (
              <motion.div 
                key={word.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">{word.word_ru}</h3>
                    <p className="text-indigo-600 font-medium">{word.translation_uz}</p>
                  </div>
                  <button className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                {word.example_ru && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
                    <Volume2 className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                    <p className="text-sm text-slate-600 italic">"{word.example_ru}"</p>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </main>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Yangi so‘z qo‘shish</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ruscha so‘z</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newWord.word_ru}
                  onChange={(e) => setNewWord({ ...newWord, word_ru: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">O‘zbekcha tarjimasi</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newWord.translation_uz}
                  onChange={(e) => setNewWord({ ...newWord, translation_uz: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Misol (ruscha)</label>
                <textarea
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  rows={2}
                  value={newWord.example_ru}
                  onChange={(e) => setNewWord({ ...newWord, example_ru: e.target.value })}
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                >
                  Qo‘shish
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
