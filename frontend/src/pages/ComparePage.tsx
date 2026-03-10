import { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { usePlans } from '../context/PlansContext';
import { useCompare } from '../context/CompareContext';
import { useLang } from '../context/LanguageContext';
import CompareOverlay from '../components/CompareOverlay';
import { Button } from '@/components/ui/button';

export default function ComparePage() {
  const [searchParams] = useSearchParams();
  const { plans } = usePlans();
  const { selectedPlans, loadPlans, setShowOverlay } = useCompare();
  const { t } = useLang();

  // Load plans from URL params on mount
  useEffect(() => {
    const idsParam = searchParams.get('plans');
    if (!idsParam || plans.length === 0) return;

    const ids = idsParam.split(',').map(Number).filter(n => !isNaN(n));
    const matched = ids
      .map(id => plans.find(p => p.id === id))
      .filter((p): p is NonNullable<typeof p> => !!p)
      .slice(0, 3);

    if (matched.length >= 2) {
      loadPlans(matched);
      setShowOverlay(true);
    }
  }, [searchParams, plans, loadPlans, setShowOverlay]);

  // Show the overlay if we have plans loaded
  if (selectedPlans.length >= 2) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <CompareOverlay />
      </div>
    );
  }

  // Fallback: not enough plans
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
      <h2 className="font-heading text-xl text-foreground">
        {t('compare.title')}
      </h2>
      <p className="text-muted-foreground text-sm text-center max-w-sm">
        {t('compareBar.selectMore')}
      </p>
      <Button asChild variant="ghost" className="text-primary">
        <Link to="/plans">
          <ArrowLeft size={16} className="rtl:rotate-180" />
          {t('detail.backToPlans')}
        </Link>
      </Button>
    </div>
  );
}
