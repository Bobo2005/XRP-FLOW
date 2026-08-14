// Script to configure Morpho market on deployed YieldRouter contract
import { ethers } from "hardhat";
import * as fs from "fs";

// Read deployed addresses
const deployed = JSON.parse(fs.readFileSync("./deployed-addresses.json", "utf8"));

async function main() {
  console.log(`Network: ${deployed.network}`);
  console.log(`Deployer: ${deployed.deployer}`);

  // Get contract addresses
  const fxrpAddress = deployed.contracts.MockFXRP;
  const kineticAddress = deployed.contracts.MockKinetic;
  const morphoAddress = deployed.contracts.MockMorpho;
  const routerAddress = deployed.contracts.YieldRouter;

  console.log(`MockFXRP: ${fxrpAddress}`);
  console.log(`MockKinetic: ${kineticAddress}`);
  console.log(`MockMorpho: ${morphoAddress}`);
  console.log(`YieldRouter: ${routerAddress}`);

  // Get signer (assuming we're using the deployer account from .env)
  const [deployer] = await ethers.getSigners();
  console.log(`Using account: ${deployer.address}`);

  // Get contract factories
  const MockFXRP = await ethers.getContractFactory("MockFXRP");
  const MockKinetic = await ethers.getContractFactory("MockKinetic");
  const MockMorpho = await ethers.getContractFactory("MockMorpho");
  const YieldRouter = await ethers.getContractFactory("YieldRouter");

  // Attach to deployed contracts
  const fxrp = MockFXRP.attach(fxrpAddress);
  const kinetic = MockKinetic.attach(kineticAddress);
  const morpho = MockMorpho.attach(morphoAddress);
  const router = YieldRouter.attach(routerAddress);

  // Check current Morpho market params
  const currentParams = await router.morphoMarketParams();
  console.log("Current Morpho market params:", {
    loanToken: currentParams.loanToken,
    collateralToken: currentParams.collateralToken,
    oracle: currentParams.oracle,
    irm: currentParams.irm,
    lltv: currentParams.lltv
  });

  // If loanToken is zero address, configure the market
  if (currentParams.loanToken === ethers.ZeroAddress) {
    console.log("Configuring Morpho market...");

    // Configure a placeholder Morpho market
    // Using FXRP as both loan and collateral token for simplicity (not realistic but works for mock)
    const tx = await router.setMorphoMarketParams({
      loanToken: fxrpAddress,      // Use MockFXRP as loan token
      collateralToken: fxrpAddress, // Use MockFXRP as collateral token (simplified)
      oracle: ethers.ZeroAddress,  // Not used in mock
      irm: ethers.ZeroAddress,     // Not used in mock
      lltv: 0n                     // 0% LTV for simplicity
    });

    const receipt = await tx.wait();
    console.log(`Morpho market configured in transaction: ${tx.hash}`);
    console.log(`Used ${receipt.gasUsed.toString()} gas`);

    // Verify configuration
    const newParams = await router.morphoMarketParams();
    console.log("New Morpho market params:", {
      loanToken: newParams.loanToken,
      collateralToken: newParams.collateralToken,
      oracle: newParams.oracle,
      irm: newParams.irm,
      lltv: newParams.lltv
    });
  } else {
    console.log("Morpho market already configured:");
    console.log({
      loanToken: currentParams.loanToken,
      collateralToken: currentParams.collateralToken,
      oracle: currentParams.oracle,
      irm: currentParams.irm,
      lltv: currentParams.lltv
    });
  }

  // Check current mock APYs
  const [kineticAPY, morphoAPY] = await Promise.all([
    router.kineticMockAPY(),
    router.morphoMockAPY()
  ]);

  console.log(`Current mock APYs:`);
  console.log(`  Kinetic: ${ethers.formatEther(kineticAPY)}`);
  console.log(`  Morpho:  ${ethers.formatEther(morphoAPY)}`);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exitCode = 1;
});