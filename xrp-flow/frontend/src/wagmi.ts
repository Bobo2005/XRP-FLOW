

import { http, createConfig, fallback } from "wagmi";
import { defineChain } from "viem";
import { injected, metaMask, coinbaseWallet, walletConnect } from "wagmi/connectors";

export const coston2 = defineChain({
  id: 114,
  name: "Flare Coston2",
  nativeCurrency: {
    name: "Coston2 Flare",
    symbol: "C2FLR",
    decimals: 18,
  },
  // Moved multicall3 contracts block to the correct root level of defineChain
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
      blockCreated: 1,
    },
  },
  rpcUrls: {
    default: {
      http: [
        "https://coston2-api.flare.network/ext/bc/C/rpc",
        "https://coston2-api.flare.network/ext/C/rpc",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Coston2 Explorer",
      url: "https://coston2-explorer.flare.network",
    },
  },
  testnet: true,
});

export const wagmiConfig = createConfig({
  chains: [coston2],
  connectors: [
    injected(),
    metaMask(),
    walletConnect({ projectId: "e10fdca2286466de06a7d1b7eed2552a" }), 
    coinbaseWallet({ appName: "XRP FLOW" }),
  ],
  transports: {
    [coston2.id]: fallback([
      http("https://coston2-api.flare.network/ext/bc/C/rpc"),
      http("https://coston2-api.flare.network/ext/C/rpc"),
    ]),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}