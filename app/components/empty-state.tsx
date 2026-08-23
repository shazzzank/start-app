import type { LinkProps } from '@tanstack/react-router';
import Button from '@/app/components/button';

export default function EmptyState({
  title,
  description,
  href,
  action,
  inline = false,
}: {
  title: string;
  description: string;
  href: LinkProps['to'];
  action: string;
  inline?: boolean;
}) {
  return (
    <div className={inline ? 'empty-in' : 'empty'}>
      <h3 className='h3'>{title}</h3>
      <p className='desc'>{description}</p>
      <Button to={href}>{action}</Button>
    </div>
  );
}
