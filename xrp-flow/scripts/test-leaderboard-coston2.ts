import { ethers } from "hardhat";
import deployedAddresses from "../deployed-addresses.json";

async function main() {
  const routerAddr = deployedAddresses.contracts.YieldRouter;
  console.log("Testing freshly deployed YieldRouter at:", routerAddr);

  const YieldRouter = await ethers.getContractFactory("YieldRouter");
  const router = YieldRouter.attach(routerAddr) as any;

  try {
    const bronze = await router.bronzeThreshold();
    console.log("✅ bronzeThreshold:", ethers.formatEther(bronze));
  } catch (err: any) {
    console.error("❌ bronzeThreshold failed:", err.message);
  }

  try {
    const top = await router.getTopUsersByReputation(10);
    console.log("✅ getTopUsersByReputation(10) returned length:", top.length);
    console.log("Top users:", top);
  } catch (err: any) {
    console.error("❌ getTopUsersByReputation failed:", err.message);
  }
}

main().catch(console.error);
