import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';
import { useLang } from '../context/LanguageContext';

export default function NotFoundPage() {
  const { lang } = useLang();

  return (
    <div className="relative z-10 safe-pb flex flex-col items-center justify-center min-h-[calc(100dvh-140px)] px-6 text-center">
      <p className="text-7xl font-heading font-bold text-primary/20 mb-2">404</p>
      <h1 className="font-heading font-bold text-2xl text-text-primary mb-2">
        {lang === 'ar' ? 'الصفحة غير موجودة' : 'Page not found'}
      </h1>
      <p className="text-sm text-text-secondary max-w-xs mb-8">
        {lang === 'ar'
          ? 'الصفحة اللي تبحث عنها مو موجودة أو تم نقلها.'
          : "The page you're looking for doesn't exist or has been moved."}
      </p>
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold
            bg-primary text-white hover:shadow-lg hover:shadow-primary/25 transition-all btn-press"
        >
          <Home size={16} />
          {lang === 'ar' ? 'الرئيسية' : 'Home'}
        </Link>
        <Link
          to="/finder"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold
            bg-surface-alt text-text-primary hover:bg-border transition-colors btn-press"
        >
          <Search size={16} />
          {lang === 'ar' ? 'البحث' : 'Finder'}
        </Link>
      </div>
    </div>
  );
}
