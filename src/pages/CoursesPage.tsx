import { ArrowLeft, ArrowRight, FileCheck2, Stamp } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import { prefetchRoutePath } from '../routeModules';
import { Button, Card, PageHeader } from '../components/ui/Foundation';

const COURSES = [
  { href: '/kurslar/patent', titleKey: 'courses.patentTitle', subtitleKey: 'courses.patentSubtitle', Icon: Stamp },
  { href: '/kurslar/vnzh', titleKey: 'courses.vnzhTitle', subtitleKey: 'courses.vnzhSubtitle', Icon: FileCheck2 },
] as const;

export default function CoursesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLocale();
  return <main className="academic-page">
    <Button variant="ghost" className="mb-5" onClick={() => location.key === 'default' ? navigate('/') : navigate(-1)}><ArrowLeft size={16} />{t('common.back')}</Button>
    <PageHeader eyebrow="Imtihonga tayyorgarlik" title={t('courses.title')} description="Maqsadingizga mos yo'nalishni tanlang. Har bir kurs mavzular va amaliy testlardan iborat." />
    <div className="grid gap-5 md:grid-cols-2">{COURSES.map(({ href, titleKey, subtitleKey, Icon }) => <Card key={href} className="course-showcase flex flex-col items-start" data-course={href.endsWith('patent') ? 'patent' : 'vnzh'}>
      <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-app-icon-bg text-app-brand"><Icon size={23} aria-hidden /></span>
      <h2 className="text-xl font-semibold text-app-text">{t(titleKey)}</h2><p className="ui-description mb-6">{t(subtitleKey)}</p>
      <Button variant="secondary" className="mt-auto" onClick={() => navigate(href)} onMouseEnter={() => prefetchRoutePath(href)} onFocus={() => prefetchRoutePath(href)} onTouchStart={() => prefetchRoutePath(href)}>Kursni ochish <ArrowRight size={16} /></Button>
    </Card>)}</div>
    <p className="ui-description mt-6">Kunlik rus tili darslari <button type="button" onClick={() => navigate('/')} className="inline-flex min-h-11 items-center font-semibold text-app-brand underline underline-offset-4">o'quv rejangizda</button> davom etadi.</p>
  </main>;
}
