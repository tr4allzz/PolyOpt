'use client'

import { ConnectButton } from '@/components/wallet/connect-button'
import Link from 'next/link'
import Image from 'next/image'

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="opt.markets logo" width={28} height={28} />
          <span className="text-xl font-bold">opt.markets</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/markets"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Markets
          </Link>
          <Link
            href="/recommended"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Recommended
          </Link>
          <Link
            href="/portfolio"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Portfolio
          </Link>
          <Link
            href="/optimize"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Optimizer
          </Link>
          <Link
            href="/leaderboard"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Leaderboard
          </Link>
          <Link
            href="/history"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            History
          </Link>
        </nav>

        <ConnectButton />
      </div>
    </header>
  )
}
