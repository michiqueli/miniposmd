import { cn } from '@/lib/cn';

type Props = React.SelectHTMLAttributes<HTMLSelectElement>;

export default function Select({ className, ...props }: Props) {
  return (
    <select
      className={cn('w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300', className)}
      {...props}
    />
  );
}
