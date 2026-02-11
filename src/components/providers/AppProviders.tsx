'use client';

import { ToastProvider } from '@/components/ui/toast';

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
