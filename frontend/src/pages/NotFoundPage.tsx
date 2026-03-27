/**
 * 404 page — shown for unrecognized routes (catch-all "*" in App.tsx).
 *
 * Displays a friendly "Page not found" message with navigation links
 * to the homepage and the plan browser. Bilingual (EN/AR).
 */
import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLang } from '../context/LanguageContext';

export default function NotFoundPage() {
  const { lang } = useLang();

  return (
    <div className="safe-pb flex flex-col items-center justify-center min-h-[calc(100dvh-140px)] px-6 text-center">
      <p className="text-7xl font-heading font-bold text-primary/20 mb-2">404</p>
      <h1 className="font-heading font-bold text-2xl text-foreground mb-2">
        {lang === 'ar' ? 'الصفحة غير موجودة' : 'Page not found'}
      </h1>
      <p className="text-sm text-muted-foreground max-w-xs mb-8">
        {lang === 'ar'
          ? 'الصفحة اللي تبحث عنها مو موجودة أو تم نقلها.'
          : "The page you're looking for doesn't exist or has been moved."}
      </p>
      <div className="flex items-center gap-3">
        <Button asChild>
          <Link to="/">
            <Home size={16} />
            {lang === 'ar' ? 'الرئيسية' : 'Home'}
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/advisor">
            <Search size={16} />
            {lang === 'ar' ? 'البحث' : 'Finder'}
          </Link>
        </Button>
      </div>
    </div>
  );
}
