'use client'

import { ConnectButton } from '@/components/wallet/connect-button'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X as MenuClose, BookOpen, Info, Gift } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useAccount } from 'wagmi'
import { useWrapped } from '@/components/wrapped'
import { Button } from '@/components/ui/button'

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const { isConnected } = useAccount()
  const { showWrapped } = useWrapped()

  const navLinks = [
    { href: '/discover', label: 'Discover' },
    { href: '/portfolio', label: 'Portfolio' },
    { href: '/leaderboard', label: 'Leaderboard' },
  ]

  const secondaryLinks = [
    { href: '/docs', label: 'Docs' },
    { href: '/about', label: 'About' },
  ]

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="opt.markets logo" width={28} height={28} />
          <span className="text-xl font-bold">opt.markets</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors",
                isActive(link.href)
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
          <span className="w-px h-4 bg-border" />
          {secondaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors",
                isActive(link.href)
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <a
            href="https://x.com/optmarkets"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Follow us on X"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          {isConnected && (
            <Button
              variant="ghost"
              size="sm"
              onClick={showWrapped}
              className="hidden sm:flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <Gift className="h-4 w-4" />
              <span>Wrapped</span>
            </Button>
          )}
          <ConnectButton />

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-accent rounded-md transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <MenuClose className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <nav className="container py-4 flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "text-sm font-medium transition-colors py-2 px-3 rounded-md",
                  isActive(link.href)
                    ? "text-foreground bg-muted"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="my-2 border-t" />
            {secondaryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "text-sm font-medium transition-colors py-2 px-3 rounded-md",
                  isActive(link.href)
                    ? "text-foreground bg-muted"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {link.label}
              </Link>
            ))}
            {isConnected && (
              <>
                <div className="my-2 border-t" />
                <button
                  onClick={() => {
                    showWrapped()
                    setMobileMenuOpen(false)
                  }}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 py-2 px-3 rounded-md transition-colors"
                >
                  <Gift className="h-4 w-4" />
                  <span>Wrapped 2025</span>
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
