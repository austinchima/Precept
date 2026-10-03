import React from 'react';
import { PageHeader } from './ui/kit';
import { cn } from '../lib/utils';

interface PageShellProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  dataTestId?: string;
  width?: 'default' | 'narrow' | 'wide';
}

/** Standard in-app page frame: max width, gutters, header, content stack. */
export default function PageShell({
  children,
  title,
  subtitle,
  actions,
  className,
  contentClassName,
  dataTestId,
  width = 'default',
}: PageShellProps) {
  return (
    <div
      data-testid={dataTestId}
      className={cn(
        'mx-auto w-full px-4 pb-16 pt-6 md:px-8 md:pt-8',
        width === 'narrow' && 'max-w-3xl',
        width === 'default' && 'max-w-6xl',
        width === 'wide' && 'max-w-[1400px]',
        className
      )}
    >
      {(title || actions) && <PageHeader title={title} description={subtitle} actions={actions} />}
      <div className={cn('flex flex-col gap-6', (title || actions) && 'mt-7', contentClassName)}>{children}</div>
    </div>
  );
}
