import { Link, type LinkProps } from '@tanstack/react-router';
import type { ComponentProps, ReactNode } from 'react';

type Variant = 'primary' | 'outline' | 'danger';
type Size = 'sm' | 'md';

const styles: Record<Variant, string> = {
  primary: 'btn-p',
  outline: 'btn-o',
  danger: 'btn-d',
};

type Shared = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

type Props =
  | (Shared & { to: LinkProps['to'] } & Omit<LinkProps, 'children' | 'className' | 'to'>)
  | (Shared & { to?: undefined } & ComponentProps<'button'>);

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: Props) {
  const classes = ['btn', styles[variant], size === 'sm' ? 'btn-sm' : 'btn-md', className].filter(Boolean).join(' ');

  if ('to' in props && props.to) {
    const { to, ...rest } = props;
    return <Link to={to} className={classes} {...rest}>{children}</Link>;
  }

  const { type = 'button', ...rest } = props as ComponentProps<'button'>;
  return <button type={type} className={classes} {...rest}>{children}</button>;
}
