/**
 * LanguagePicker — dropdown to switch between supported languages.
 *
 * Uses a native <select> under the hood for zero extra deps and good a11y.
 * Styling variants: "footer" (dark footer) and "onboarding" (light card buttons).
 */
import { Globe } from 'lucide-react';
import { useLang, SUPPORTED_LANGS, LANG_LABELS, type Lang } from '../context/LanguageContext';

interface Props {
  variant?: 'footer' | 'inline';
  className?: string;
}

export default function LanguagePicker({ variant = 'inline', className = '' }: Props) {
  const { lang, setLang } = useLang();

  const base = 'appearance-none bg-transparent border rounded-lg px-2.5 py-1 text-sm cursor-pointer focus:outline-none focus:ring-1';
  const footerStyle = 'border-white/15 text-white/70 hover:text-white hover:border-white/30 focus:ring-white/30';
  const inlineStyle = 'border-border text-foreground hover:bg-muted focus:ring-primary/40';

  return (
    <label className={`inline-flex items-center gap-1.5 ${className}`}>
      <Globe size={14} className={variant === 'footer' ? 'text-white/40' : 'text-muted-foreground'} />
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        className={`${base} ${variant === 'footer' ? footerStyle : inlineStyle}`}
        aria-label="Select language"
      >
        {SUPPORTED_LANGS.map((l) => (
          <option key={l} value={l} className="text-foreground bg-background">
            {LANG_LABELS[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
