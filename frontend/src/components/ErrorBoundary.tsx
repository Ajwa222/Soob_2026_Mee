/**
 * Top-level error boundary — catches unhandled React errors and shows a fallback UI.
 *
 * Wraps the entire app in App.tsx. If any child component throws during rendering,
 * this catches it, logs the error, and displays a "Something went wrong" message
 * instead of a blank white screen.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      const isAr = localStorage.getItem('simba-lang') === 'ar';
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg,#fff)] px-6" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="text-center max-w-sm">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">!</span>
            </div>
            <h1 className="text-lg font-bold text-[var(--color-text-primary,#1a1a1a)] mb-2">
              {isAr ? 'حدث خطأ غير متوقع' : 'Something went wrong'}
            </h1>
            <p className="text-sm text-[var(--color-text-secondary,#666)] mb-6">
              {isAr ? 'حدث خطأ غير متوقع. يرجى إعادة تحميل الصفحة.' : 'An unexpected error occurred. Please reload the page.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 rounded-xl text-sm font-bold bg-primary text-white
                hover:bg-primary-dark transition-colors"
            >
              {isAr ? 'إعادة التحميل' : 'Reload'}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
