// // import { ethers, network } from "hardhat";
// // import * as fs from "fs";
// // import * as path from "path";

// // /**
// //  * Deploys MockFXRP, MockKinetic, and YieldRouter (in that order) and writes
// //  * the resulting addresses to deployed-addresses.json.
// //  *
// //  * MockFXRP and MockKinetic are testnet stand-ins:
// //  *  - MockFXRP lets us exercise the full deposit/withdraw flow on Coston2
// //  *    without depending on a real FXRP mint.
// //  *  - MockKinetic stands in for Kinetic Market until the real Kinetic
// //  *    contract address/ABI on Coston2 is confirmed (see the TODOs in
// //  *    contracts/interfaces/IKinetic.sol). Swap this for the real Kinetic
// //  *    market address once available.
// //  */
// // async function main() {
// //   const [deployer] = await ethers.getSigners();

// //   console.log(`Network: ${network.name}`);
// //   console.log(`Deployer: ${deployer.address}`);

// //   const deployerBalance = await ethers.provider.getBalance(deployer.address);
// //   console.log(`Deployer balance: ${ethers.formatEther(deployerBalance)} C2FLR`);

// //   // 1. Deploy MockFXRP
// //   const initialSupply = ethers.parseEther("1000000");
// //   const MockFXRP = await ethers.getContractFactory("MockFXRP");
// //   const fxrp = await MockFXRP.deploy(initialSupply);
// //   await fxrp.waitForDeployment();
// //   const fxrpAddress = await fxrp.getAddress();
// //   console.log(`MockFXRP deployed to: ${fxrpAddress}`);

// //   // 2. Deploy MockKinetic
// //   const MockKinetic = await ethers.getContractFactory("MockKinetic");
// //   const kinetic = await MockKinetic.deploy();
// //   await kinetic.waitForDeployment();
// //   const kineticAddress = await kinetic.getAddress();
// //   console.log(`MockKinetic deployed to: ${kineticAddress}`);

// //   // 3. Deploy YieldRouter
// //   const YieldRouter = await ethers.getContractFactory("YieldRouter");
// //   const router = await YieldRouter.deploy(
// //     fxrpAddress,
// //     kineticAddress,
// //     deployer.address
// //   );
// //   await router.waitForDeployment();
// //   const routerAddress = await router.getAddress();
// //   console.log(`YieldRouter deployed to: ${routerAddress}`);

// //   // Write addresses out for the frontend / later scripts to consume.
// //   const output = {
// //     network: network.name,
// //     chainId: network.config.chainId,
// //     deployer: deployer.address,
// //     deployedAt: new Date().toISOString(),
// //     contracts: {
// //       MockFXRP: fxrpAddress,
// //       MockKinetic: kineticAddress,
// //       YieldRouter: routerAddress,
// //     },
// //   };

// //   const outputPath = path.join(__dirname, "..", "deployed-addresses.json");
// //   fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");
// //   console.log(`\nAddresses written to ${outputPath}`);
// // }

// // main().catch((error) => {
// //   console.error(error);
// //   process.exitCode = 1;
// // });

// // 3. Deploy YieldRouter
//   const YieldRouter = await ethers.getContractFactory("YieldRouter");
//   const router = await YieldRouter.deploy(
//     fxrpAddress,
//     kineticAddress,
//     deployer.address
//   );
//   const deployTx = router.deploymentTransaction();
//   await router.waitForDeployment();
//   const routerAddress = await router.getAddress();
//   const deployReceipt = deployTx ? await deployTx.wait() : null;
//   const deployBlock = deployReceipt ? deployReceipt.blockNumber : null;
//   console.log(`YieldRouter deployed to: ${routerAddress} (block ${deployBlock})`);

//   // Write addresses out for the frontend / later scripts to consume.
//   const output = {
//     network: network.name,
//     chainId: network.config.chainId,
//     deployer: deployer.address,
//     deployedAt: new Date().toISOString(),
//     // Lets the frontend scan Deposited/Withdrawn logs from this block
//     // instead of from block 0, which would be slow on a public RPC.
//     deployBlock,
//     contracts: {
//       MockFXRP: fxrpAddress,
//       MockKinetic: kineticAddress,
//       YieldRouter: routerAddress,
//     },
//   }; 

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deploys MockFXRP, MockKinetic, MockMorpho, and YieldRouter (in that
 * order), configures a placeholder Morpho market and starting mock APYs,
 * and writes the resulting addresses to deployed-addresses.json.
 *
 * MockFXRP, MockKinetic, and MockMorpho are testnet stand-ins:
 *  - MockFXRP lets us exercise the full deposit/withdraw flow on Coston2
 *    without depending on a real FXRP mint.
 *  - MockKinetic and MockMorpho stand in for the real protocols until
 *    Coston2 addresses are confirmed (see the TODOs in
 *    contracts/interfaces/IKinetic.sol and IMorpho.sol — as of this
 *    writing, neither protocol has a documented Coston2 deployment; see
 *    README.md).
 */
async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];

  if (!deployer) {
    throw new Error(
      "No deployer account found. This means PRIVATE_KEY in your .env file " +
        "is missing or empty. Copy .env.example to .env (if you haven't) " +
        "and set PRIVATE_KEY to your Coston2 wallet's private key, then " +
        "try again."
    );
  }

  console.log(`Network: ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);

  const deployerBalance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance: ${ethers.formatEther(deployerBalance)} C2FLR`);

  // 1. Deploy MockFXRP
  const initialSupply = ethers.parseEther("1000000");
  const MockFXRP = await ethers.getContractFactory("MockFXRP");
  const fxrp = await MockFXRP.deploy(initialSupply);
  await fxrp.waitForDeployment();
  const fxrpAddress = await fxrp.getAddress();
  console.log(`MockFXRP deployed to: ${fxrpAddress}`);

  // 2. Deploy MockKinetic
  const MockKinetic = await ethers.getContractFactory("MockKinetic");
  const kinetic = await MockKinetic.deploy();
  await kinetic.waitForDeployment();
  const kineticAddress = await kinetic.getAddress();
  console.log(`MockKinetic deployed to: ${kineticAddress}`);

  // 3. Deploy MockMorpho
  const MockMorpho = await ethers.getContractFactory("MockMorpho");
  const morpho = await MockMorpho.deploy();
  await morpho.waitForDeployment();
  const morphoAddress = await morpho.getAddress();
  console.log(`MockMorpho deployed to: ${morphoAddress}`);

  // 4. Deploy YieldRouter
  const YieldRouter = await ethers.getContractFactory("YieldRouter");
  const router = await YieldRouter.deploy(
    fxrpAddress,
    kineticAddress,
    morphoAddress,
    deployer.address
  );
  const deployTx = router.deploymentTransaction();
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  const deployReceipt = deployTx ? await deployTx.wait() : null;
  const deployBlock = deployReceipt ? deployReceipt.blockNumber : null;
  console.log(`YieldRouter deployed to: ${routerAddress} (block ${deployBlock})`);

  // 5. Configure a placeholder Morpho market so the Morpho routing path is
  //    reachable in the demo. Real loanToken/collateralToken/oracle/irm
  //    values aren't known — MockMorpho doesn't validate MarketParams
  //    content, so this only needs a non-zero loanToken to satisfy
  //    YieldRouter's MorphoMarketNotConfigured guard.
  const Venue = { Kinetic: 0, Morpho: 1 } as const;
  await (
    await router.setMorphoMarketParams({
      loanToken: fxrpAddress,
      collateralToken: fxrpAddress,
      oracle: ethers.ZeroAddress,
      irm: ethers.ZeroAddress,
      lltv: 0n,
    })
  ).wait();
  console.log("Configured placeholder Morpho market params");

  // 6. Seed starting mock APYs so the dashboard isn't showing 0.00% before
  //    anyone calls setMockAPY by hand.
  await (await router.setMockAPY(Venue.Kinetic, ethers.parseEther("0.048"))).wait(); // 4.8%
  await (await router.setMockAPY(Venue.Morpho, ethers.parseEther("0.043"))).wait(); // 4.3%
  console.log("Seeded starting mock APYs (Kinetic 4.8%, Morpho 4.3%)");

  // Write addresses out for the frontend / later scripts to consume.
  const output = {
    network: network.name,
    chainId: network.config.chainId,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    // Lets the frontend scan Deposited/Withdrawn logs from this block
    // instead of from block 0, which would be slow on a public RPC.
    deployBlock,
    contracts: {
      MockFXRP: fxrpAddress,
      MockKinetic: kineticAddress,
      MockMorpho: morphoAddress,
      YieldRouter: routerAddress,
    },
  };

  const outputPath = path.join(__dirname, "..", "deployed-addresses.json");
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");
  console.log(`\nAddresses written to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});