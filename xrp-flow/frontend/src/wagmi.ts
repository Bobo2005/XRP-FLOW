// import { http, createConfig } from "wagmi";
// import { defineChain } from "viem";
// import { injected } from "wagmi/connectors";

// /**
//  * Flare Coston2 testnet.
//  * Chain ID 114, matching the Hardhat network config in hardhat.config.ts.
//  */
// export const coston2 = defineChain({
//   id: 114,
//   name: "Flare Coston2",
//   nativeCurrency: {
//     name: "Coston2 Flare",
//     symbol: "C2FLR",
//     decimals: 18,
//   },
//   rpcUrls: {
//     default: {
//       http: ["https://coston2-api.flare.network/ext/C/rpc"],
//     },
//   },
//   blockExplorers: {
//     default: {
//       name: "Coston2 Explorer",
//       url: "https://coston2-explorer.flare.network",
//     },
//   },
//   testnet: true,
// });

// export const wagmiConfig = createConfig({
//   chains: [coston2],
//   connectors: [injected()],
//   transports: {
//     [coston2.id]: http(),
//   },
// });

// declare module "wagmi" {
//   interface Register {
//     config: typeof wagmiConfig;
//   }
// }

import { http, createConfig, fallback } from "wagmi";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";

/**
 * Flare Coston2 testnet.
 * Chain ID 114, matching the Hardhat network config in hardhat.config.ts.
 */
export const coston2 = defineChain({
  id: 114,
  name: "Flare Coston2",
  nativeCurrency: {
    name: "Coston2 Flare",
    symbol: "C2FLR",
    decimals: 18,
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
  connectors: [injected()],
  transports: {
    [coston2.id]: fallback([
      // Primary alternative route path on Coston2 (often bypasses main endpoint CORS)
      http("https://coston2-api.flare.network/ext/bc/C/rpc"),
      // Fallback to the official default endpoint
      http("https://coston2-api.flare.network/ext/C/rpc"),
    ]),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}