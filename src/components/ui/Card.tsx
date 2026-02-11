import { cn } from '@/lib/cn';

type Props = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: Props) {
  return <div className={cn('rounded-2xl border border-slate-200 bg-white shadow-sm', className)} {...props} />;
}

export function CardHeader({ className, ...props }: Props) {
  return <div className={cn('p-5 border-b border-slate-100', className)} {...props} />;
}

export function CardContent({ className, ...props }: Props) {
  return <div className={cn('p-5', className)} {...props} />;
}
