'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
            <AlertTriangle size={48} className="mx-auto text-danger" />
            <h2 className="text-xl font-bold text-concrete-800">حدث خطأ غير متوقع</h2>
            <p className="text-concrete-500 text-sm">
              {this.state.error?.message || 'فشلت تحميل هذا المكون.'}
            </p>
            <button
              onClick={this.handleReset}
              className="bg-petrol text-white px-6 py-2 rounded-lg hover:bg-petrol-dark inline-flex items-center gap-2"
            >
              <RefreshCw size={16} />
              إعادة المحاولة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
