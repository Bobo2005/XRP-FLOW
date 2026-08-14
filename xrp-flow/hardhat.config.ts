import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import "./scripts/mint-fxrp";

dotenv.config();

const rawPrivateKey = (process.env.PRIVATE_KEY ?? "").trim();
// Accept a key pasted with or without the 0x prefix.
const PRIVATE_KEY =
  rawPrivateKey && !rawPrivateKey.startsWith("0x")
    ? `0x${rawPrivateKey}`
    : rawPrivateKey;
const COSTON2_RPC_URL =
  process.env.COSTON2_RPC_URL ?? "https://coston2-api.flare.network/ext/C/rpc";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {},
    coston2: {
      url: COSTON2_RPC_URL,
      chainId: 114,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;