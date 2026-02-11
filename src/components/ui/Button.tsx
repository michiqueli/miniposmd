import { cn } from '@/lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-slate-900 text-white hover:bg-slate-800',
  secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200',
  danger: 'bg-red-100 text-red-700 hover:bg-red-200',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
};

export default function Button({ className, variant = 'primary', ...props }: Props) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
