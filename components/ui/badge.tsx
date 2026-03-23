'use client';

import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-4xl border border-transparent px-2 py-0.5 font-medium text-xs transition-all focus-visible:ring-2 focus-visible:ring-primary/50 motion-reduce:transition-none [&>svg]:pointer-events-none [&>svg]:size-3!',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-background',
        secondary: 'bg-secondary text-background',
        tertiary: 'bg-tertiary text-white',
        outline: 'border-border bg-transparent text-primary',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  }
);

function Badge({
  className,
  variant = 'primary',
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: 'badge',
      variant,
    },
  });
}

export { Badge, badgeVariants };
