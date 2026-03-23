'use client';

import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import type * as React from 'react';

import { cn } from '@/lib/utils';
import { ChevronLeftIcon } from 'lucide-react';

function DropdownMenu({ ...props }: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuPortal({ ...props }: MenuPrimitive.Portal.Props) {
  return <MenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />;
}

function DropdownMenuTrigger({
  render,
  ...props
}: MenuPrimitive.Trigger.Props & { render?: React.ReactElement }) {
  return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" render={render} {...props} />;
}

function DropdownMenuContent({
  align = 'start',
  alignOffset = 0,
  side = 'bottom',
  sideOffset = 0,
  className,
  onKeyDown,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<MenuPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'>) {
  const handleKeyDown: MenuPrimitive.Popup.Props['onKeyDown'] = e => {
    const keyMap: Record<string, string> = {
      w: 'ArrowUp',
      W: 'ArrowUp',
      s: 'ArrowDown',
      S: 'ArrowDown',
      a: 'ArrowLeft',
      A: 'ArrowLeft',
      d: 'ArrowRight',
      D: 'ArrowRight',
    };

    const mappedKey = keyMap[e.key];
    if (mappedKey) {
      // Impede o Base UI de processar a tecla original (evita type-ahead de 'S' para 'Sistema')
      e.preventBaseUIHandler();

      const event = new KeyboardEvent('keydown', {
        key: mappedKey,
        code: mappedKey,
        bubbles: true,
        cancelable: true,
      });
      e.currentTarget.dispatchEvent(event);
      e.preventDefault();
      return;
    }

    onKeyDown?.(e);
  };

  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          onKeyDown={handleKeyDown}
          className={cn(
            'z-50 max-h-(--available-height) w-auto min-w-max origin-(--transform-origin) overflow-y-auto overflow-x-hidden rounded-xs border-border border bg-background p-0 text-primary shadow-md outline-none duration-100 data-[side=bottom]:slide-in-from-top-0 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:overflow-hidden data-closed:fade-out-0 data-closed:zoom-out-95 motion-reduce:animate-none motion-reduce:duration-0',
            className
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

function DropdownMenuGroup({ ...props }: MenuPrimitive.Group.Props) {
  return <MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: MenuPrimitive.GroupLabel.Props & {
  inset?: boolean;
}) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        'flex justify-end px-2 py-1 font-medium text-secondary text-xs data-inset:pl-8',
        className
      )}
      {...props}
    />
  );
}

function DropdownMenuItem({
  className,
  inset,
  variant = 'default',
  ...props
}: MenuPrimitive.Item.Props & {
  inset?: boolean;
  variant?: 'default' | 'destructive';
}) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "group/dropdown-menu-item relative flex flex-row-reverse cursor-pointer select-none items-center justify-start gap-2 rounded-none px-2 py-1.5 text-sm outline-none transition-colors hover:bg-primary hover:text-background data-highlighted:bg-primary data-highlighted:text-background data-disabled:pointer-events-none data-disabled:opacity-50 data-inset:pl-8 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      {...props}
    />
  );
}

function DropdownMenuSub({ ...props }: MenuPrimitive.SubmenuRoot.Props) {
  return <MenuPrimitive.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />;
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: MenuPrimitive.SubmenuTrigger.Props & {
  inset?: boolean;
}) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "flex flex-row-reverse cursor-pointer select-none items-center justify-start gap-2 rounded-xs px-2 py-1.5 text-sm outline-none transition-colors hover:bg-primary hover:text-background data-highlighted:bg-primary data-highlighted:text-background data-open:bg-secondary/10 data-inset:pl-8 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      {...props}
    >
      <ChevronLeftIcon className="size-4 opacity-60" />
      {children}
    </MenuPrimitive.SubmenuTrigger>
  );
}

function DropdownMenuSubContent({
  align = 'start',
  alignOffset = -4,
  side = 'left',
  sideOffset = 0,
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) {
  return (
    <DropdownMenuContent
      data-slot="dropdown-menu-sub-content"
      className={cn(
        'w-auto min-w-[120px] rounded-xs border-border border bg-background p-1 text-primary shadow-lg duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:overflow-hidden data-closed:fade-out-0 data-closed:zoom-out-95 motion-reduce:animate-none motion-reduce:duration-0',
        className
      )}
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      {...props}
    />
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  inset,
  ...props
}: MenuPrimitive.CheckboxItem.Props & {
  inset?: boolean;
}) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      data-inset={inset}
      className={cn(
        "relative flex flex-row-reverse cursor-pointer select-none items-center justify-start gap-2 rounded-xs py-1.5 px-2 text-sm outline-none transition-colors hover:bg-primary hover:text-background data-highlighted:bg-primary data-highlighted:text-background data-checked:bg-secondary/15 data-disabled:pointer-events-none data-disabled:opacity-50 data-inset:pl-8 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      checked={checked}
      {...props}
    >
      {children}
    </MenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioGroup({ ...props }: MenuPrimitive.RadioGroup.Props) {
  return <MenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

function DropdownMenuRadioItem({
  className,
  children,
  inset,
  ...props
}: MenuPrimitive.RadioItem.Props & {
  inset?: boolean;
}) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      data-inset={inset}
      className={cn(
        "relative flex flex-row-reverse cursor-pointer select-none items-center justify-start gap-2 rounded-xs py-1.5 px-2 text-sm outline-none transition-colors hover:bg-primary hover:text-background data-highlighted:bg-primary data-highlighted:text-background data-checked:bg-secondary/15 data-disabled:pointer-events-none data-disabled:opacity-50 data-inset:pl-8 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      {...props}
    >
      {children}
    </MenuPrimitive.RadioItem>
  );
}

function DropdownMenuSeparator({ className, ...props }: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn('-mx-1 my-0 h-px bg-border', className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn('ml-auto text-secondary text-xs tracking-widest', className)}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
};
