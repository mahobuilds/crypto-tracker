import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Panel } from './Panel';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/** Margin and sizing classes belong on the outer shell; everything else lays out the content. */
const SHELL_CLASS_PATTERN =
  /^(-?m[tbsexy]?-|w-|min-w-|max-w-|h-|min-h-|self-|col-span-|row-span-|hidden$|block$|md:|lg:|sm:)/;

function splitClassName(className: string | undefined): { shell?: string; content?: string } {
  if (!className) return {};
  const shell: string[] = [];
  const content: string[] = [];
  for (const token of className.split(/\s+/).filter(Boolean)) {
    (SHELL_CLASS_PATTERN.test(token) ? shell : content).push(token);
  }
  return { shell: shell.join(' ') || undefined, content: content.join(' ') || undefined };
}

/**
 * Backward-compatible alias of `Panel`. Existing pages pass layout classes such as
 * `flex flex-col gap-4` (content) or `mt-6` (outer margin); both keep working.
 */
export function Card({ className, children, ...rest }: CardProps) {
  const { shell, content } = splitClassName(className);
  return (
    <Panel className={shell} contentClassName={content} {...rest}>
      {children}
    </Panel>
  );
}

export function CardHeader({ className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn('mb-4 flex flex-wrap items-center justify-between gap-3', className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
}

export function CardTitle({ className, children, ...rest }: CardTitleProps) {
  return (
    <h2 className={cn('text-h2 text-ink', className)} {...rest}>
      {children}
    </h2>
  );
}
