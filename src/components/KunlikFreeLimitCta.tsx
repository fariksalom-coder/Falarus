import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import { prefetchRoutePath } from '../routeModules';

export default function KunlikFreeLimitCta() {
  const navigate = useNavigate();
  const { t } = useLocale();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="px-4 pt-4 pb-2"
    >
      <motion.button
        type="button"
        onClick={() => navigate('/tariflar')}
        onMouseEnter={() => prefetchRoutePath('/tariflar')}
        onTouchStart={() => prefetchRoutePath('/tariflar')}
        onFocus={() => prefetchRoutePath('/tariflar')}
        animate={{
          scale: [1, 1.03, 1],
          boxShadow: [
            '0 14px 34px rgba(37,99,235,0.22)',
            '0 18px 44px rgba(37,99,235,0.38)',
            '0 14px 34px rgba(37,99,235,0.22)',
          ],
        }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        className="min-h-[52px] w-full rounded-2xl bg-blue-600 px-4 py-3.5 text-center text-[15px] font-extrabold text-white"
      >
        {t('kunlik.continueCta')}
      </motion.button>
    </motion.div>
  );
}
