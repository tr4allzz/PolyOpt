'use client'

import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect, useBalance, useChainId, useSwitchChain } from 'wagmi'
import { polygon } from 'wagmi/chains'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { shortenAddress } from '@/lib/polymarket/utils'
import { WalletAvatar } from '@/components/ui/wallet-avatar'
import {
  Wallet,
  LogOut,
  ChevronDown,
  Copy,
  ExternalLink,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Wallet icons/logos as simple colored indicators
const walletMeta: Record<string, { color: string; name: string }> = {
  'injected': { color: '#F6851B', name: 'Browser Wallet' },
  'metaMask': { color: '#F6851B', name: 'MetaMask' },
  'coinbaseWalletSDK': { color: '#0052FF', name: 'Coinbase Wallet' },
  'walletConnect': { color: '#3B99FC', name: 'WalletConnect' },
}

// Chain info for display
const chainInfo: Record<number, { name: string; color: string; explorer: string }> = {
  1: { name: 'Ethereum', color: '#627EEA', explorer: 'https://etherscan.io' },
  137: { name: 'Polygon', color: '#8247E5', explorer: 'https://polygonscan.com' },
  42161: { name: 'Arbitrum', color: '#28A0F0', explorer: 'https://arbiscan.io' },
  10: { name: 'Optimism', color: '#FF0420', explorer: 'https://optimistic.etherscan.io' },
  8453: { name: 'Base', color: '#0052FF', explorer: 'https://basescan.org' },
}

export function ConnectButton() {
  const { address, isConnected, connector } = useAccount()
  const { connect, connectors, isPending, error: connectError } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const { data: balance } = useBalance({ address })

  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [connectingId, setConnectingId] = useState<string | null>(null)

  // Reset connecting state when connection succeeds or fails
  useEffect(() => {
    if (isConnected || connectError) {
      setConnectingId(null)
      if (isConnected) {
        setIsOpen(false)
      }
    }
  }, [isConnected, connectError])

  const handleConnect = (connectorId: string) => {
    const selectedConnector = connectors.find(c => c.id === connectorId)
    if (selectedConnector) {
      setConnectingId(connectorId)
      connect({ connector: selectedConnector })
    }
  }

  const handleCopyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const currentChain = chainId ? chainInfo[chainId] : null
  const isWrongNetwork = chainId !== polygon.id

  // Connected state with dropdown menu
  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-10 px-3 gap-2 border-border/50 hover:border-border"
          >
            <WalletAvatar address={address} size="sm" className="w-6 h-6" />
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">{shortenAddress(address)}</span>
              {balance && (
                <span className="text-[10px] text-muted-foreground leading-none">
                  {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
                </span>
              )}
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">Connected</p>
              <p className="text-xs text-muted-foreground">
                via {connector?.name || 'Unknown'}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Network indicator */}
          <div className="px-2 py-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Network</span>
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: currentChain?.color || '#888' }}
                />
                <span className="text-xs font-medium">
                  {currentChain?.name || `Chain ${chainId}`}
                </span>
              </div>
            </div>
            {isWrongNetwork && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 h-7 text-xs text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"
                onClick={() => switchChain?.({ chainId: polygon.id })}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Switch to Polygon
              </Button>
            )}
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleCopyAddress} className="cursor-pointer">
            {copied ? (
              <Check className="h-4 w-4 mr-2 text-green-500" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            {copied ? 'Copied!' : 'Copy Address'}
          </DropdownMenuItem>

          {currentChain?.explorer && (
            <DropdownMenuItem asChild>
              <a
                href={`${currentChain.explorer}/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View on Explorer
              </a>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => disconnect()}
            className="cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Disconnected state with modal
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Wallet className="h-4 w-4" />
          Connect Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Wallet</DialogTitle>
          <DialogDescription>
            Choose your preferred wallet to connect to opt.markets
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {connectors.map((connector) => {
            const meta = walletMeta[connector.id] || {
              color: '#888',
              name: connector.name
            }
            const isConnecting = connectingId === connector.id && isPending

            return (
              <Button
                key={connector.id}
                variant="outline"
                className={cn(
                  "w-full h-14 justify-start gap-3 px-4",
                  "hover:bg-accent/50 transition-all",
                  isConnecting && "border-primary"
                )}
                onClick={() => handleConnect(connector.id)}
                disabled={isPending}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: meta.color }}
                >
                  {isConnecting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    meta.name.charAt(0)
                  )}
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-medium">{meta.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {connector.id === 'injected' && 'Browser extension'}
                    {connector.id === 'metaMask' && 'Popular choice'}
                    {connector.id === 'coinbaseWalletSDK' && 'Easy onboarding'}
                    {connector.id === 'walletConnect' && 'Mobile & desktop'}
                  </span>
                </div>
                {isConnecting && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    Connecting...
                  </span>
                )}
              </Button>
            )
          })}
        </div>

        {connectError && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Connection failed</p>
              <p className="text-xs opacity-80">
                {connectError.message.includes('rejected')
                  ? 'You rejected the connection request'
                  : 'Please try again or use a different wallet'}
              </p>
            </div>
          </div>
        )}

        <div className="text-center text-xs text-muted-foreground pt-2 border-t">
          By connecting, you agree to our Terms of Service
        </div>
      </DialogContent>
    </Dialog>
  )
}
