import { Link } from '@tanstack/react-router';
import type { ComponentProps, ReactNode } from 'react';

type Variant = 'primary' | 'outline' | 'danger';
type Size = 'sm' | 'md';

const styles: Record<Variant, string> = {
  primary: 'btn-p',
  outline: 'btn-o',
  danger: 'btn-d',
};

type Props = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
} & (
  | ({ to: string; params?: Record<string, string> } & Omit<ComponentProps<typeof Link>, 'children' | 'className'>)
  | ({ to?: undefined } & ComponentProps<'button'>)
);

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: Props) {
  const classes = ['btn', styles[variant], size === 'sm' ? 'btn-sm' : 'btn-md', className].filter(Boolean).join(' ');

  if ('to' in props && props.to) {
    const { to, params, ...rest } = props;
    return <Link to={to} params={params} className={classes} {...rest}>{children}</Link>;
  }

  const { type = 'button', ...rest } = props as ComponentProps<'button'>;
  return <button type={type} className={classes} {...rest}>{children}</button>;
}
