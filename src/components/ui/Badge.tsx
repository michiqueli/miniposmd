import { cn } from '@/lib/cn';

type Variant = 'success' | 'warning' | 'info' | 'neutral';

const styles: Record<Variant, string> = {
  success: 'bg-green-100 text-green-700',
  warning: 'bg-orange-100 text-orange-700',
  info: 'bg-blue-100 text-blue-700',
  neutral: 'bg-slate-100 text-slate-700',
};

export default function Badge({
  children,
  className,
  variant = 'neutral',
}: {
  children: React.ReactNode;
  className?: string;
  variant?: Variant;
}) {
  return <span className={cn('inline-flex rounded-full px-2 py-1 text-xs font-bold', styles[variant], className)}>{children}</span>;
}
