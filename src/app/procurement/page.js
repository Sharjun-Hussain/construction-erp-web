'use client';
import { useAppStore } from '@/store/useAppStore';
import { t } from '@/lib/i18n';
export default function Page() {
  const { lang } = useAppStore();
  return (
    <div>
      <div className='page-head'><h2>{t(lang, 'procurement')}</h2></div>
      <div className='card'><p>Advanced UI for this module is next in queue — API is live under /api/v1.</p></div>
    </div>
  );
}
