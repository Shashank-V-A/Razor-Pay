'use client'

import * as React from 'react'
import { NavigationMenu as NavigationMenuPrimitive } from '@base-ui/react/navigation-menu'
import Icon from '@frontend/components/Icon'

type ClassNameProp = string | undefined

export function navigationMenuTriggerStyle(className?: ClassNameProp): string {
  return ['pv-nav-menu__trigger', className].filter(Boolean).join(' ')
}

export const NavigationMenu = React.forwardRef<
  HTMLElement,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root>
>(function NavigationMenu({ className, ...props }, ref) {
  return (
    <NavigationMenuPrimitive.Root
      ref={ref}
      className={['pv-nav-menu', className].filter(Boolean).join(' ')}
      {...props}
    />
  )
})

export const NavigationMenuList = React.forwardRef<
  HTMLUListElement,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.List>
>(function NavigationMenuList({ className, ...props }, ref) {
  return (
    <NavigationMenuPrimitive.List
      ref={ref}
      className={['pv-nav-menu__list', className].filter(Boolean).join(' ')}
      {...props}
    />
  )
})

export const NavigationMenuItem = NavigationMenuPrimitive.Item

export const NavigationMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Trigger>
>(function NavigationMenuTrigger({ className, children, ...props }, ref) {
  return (
    <NavigationMenuPrimitive.Trigger
      ref={ref}
      className={['pv-nav-menu__trigger', className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
      <NavigationMenuPrimitive.Icon className="pv-nav-menu__chevron">
        <Icon name="chevronDown" size={14} />
      </NavigationMenuPrimitive.Icon>
    </NavigationMenuPrimitive.Trigger>
  )
})

export const NavigationMenuContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Content>
>(function NavigationMenuContent({ className, ...props }, ref) {
  return (
    <NavigationMenuPrimitive.Content
      ref={ref}
      className={['pv-nav-menu__content', className].filter(Boolean).join(' ')}
      {...props}
    />
  )
})

export const NavigationMenuLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Link>
>(function NavigationMenuLink({ className, ...props }, ref) {
  return (
    <NavigationMenuPrimitive.Link
      ref={ref}
      className={['pv-nav-menu__link', className].filter(Boolean).join(' ')}
      {...props}
    />
  )
})

export function NavigationMenuViewport(
  props: React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Viewport>,
) {
  return <NavigationMenuPrimitive.Viewport className="pv-nav-menu__viewport" {...props} />
}

export function NavigationMenuIndicator() {
  return null
}

export function NavigationMenuPortal() {
  return (
    <NavigationMenuPrimitive.Portal>
      <NavigationMenuPrimitive.Positioner
        sideOffset={8}
        collisionPadding={{ top: 8, bottom: 8, left: 16, right: 16 }}
        className="pv-nav-menu__positioner"
      >
        <NavigationMenuPrimitive.Popup className="pv-nav-menu__popup">
          <NavigationMenuPrimitive.Arrow className="pv-nav-menu__arrow" />
          <NavigationMenuViewport />
        </NavigationMenuPrimitive.Popup>
      </NavigationMenuPrimitive.Positioner>
    </NavigationMenuPrimitive.Portal>
  )
}