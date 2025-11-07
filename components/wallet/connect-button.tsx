'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Button } from '@/components/ui/button'
import { shortenAddress } from '@/lib/polymarket/utils'
import { Wallet, LogOut } from 'lucide-react'

export function ConnectButton() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <div className="px-3 py-1.5 text-sm bg-secondary rounded-md">
          {shortenAddress(address)}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => disconnect()}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      {connectors.map((connector) => (
        <Button
          key={connector.id}
          onClick={() => connect({ connector })}
          variant="default"
        >
          <Wallet className="h-4 w-4 mr-2" />
          Connect {connector.name}
        </Button>
      ))}
    </div>
  )
}
