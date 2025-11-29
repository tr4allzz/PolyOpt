'use client'

import { getGradientStyle } from '@/lib/utils/avatar'
import { cn } from '@/lib/utils'

interface WalletAvatarProps {
  address: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
}

export function WalletAvatar({ address, size = 'md', className }: WalletAvatarProps) {
  const initials = address.slice(2, 4).toUpperCase()

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold font-mono text-white shadow-sm',
        sizeClasses[size],
        className
      )}
      style={getGradientStyle(address)}
    >
      {initials}
    </div>
  )
}
