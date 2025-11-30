// lib/wagmi.ts
import { createConfig, http } from 'wagmi'
import { polygon, arbitrum, mainnet, optimism, base } from 'wagmi/chains'
import { coinbaseWallet, injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [polygon, arbitrum, mainnet, optimism, base],
  connectors: [
    injected(),
    coinbaseWallet({ appName: 'opt.markets' }),
  ],
  transports: {
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [mainnet.id]: http(),
    [optimism.id]: http(),
    [base.id]: http(),
  },
  ssr: true,
})
