// lib/wagmi.ts
import { createConfig, http } from 'wagmi'
import { polygon, arbitrum, mainnet, optimism, base } from 'wagmi/chains'
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors'

// Get WalletConnect project ID from environment
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

export const config = createConfig({
  chains: [polygon, arbitrum, mainnet, optimism, base],
  connectors: [
    injected(),
    coinbaseWallet({ appName: 'opt.markets' }),
    walletConnect({ projectId }),
  ],
  transports: {
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [mainnet.id]: http(),
    [optimism.id]: http(),
    [base.id]: http(),
  },
})
