import { task } from "hardhat/config";
import * as fs from "fs";
import * as path from "path";

/**
 * Mints test FXRP to an address on whatever deployment is currently in
 * deployed-addresses.json. Needed because every `npm run deploy:coston2`
 * deploys a brand-new MockFXRP contract — old balances in your wallet
 * (from a previous deployment) won't carry over.
 *
 * Usage:
 *   npx hardhat mint-fxrp --to 0xYourAddress --network coston2
 *   npx hardhat mint-fxrp --to 0xYourAddress --amount 500 --network coston2
 */
task("mint-fxrp", "Mints test FXRP to an address on the current MockFXRP deployment")
  .addParam("to", "The address to mint FXRP to")
  .addOptionalParam("amount", "Amount of FXRP to mint (whole tokens)", "1000")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;

    if (!ethers.isAddress(taskArgs.to)) {
      throw new Error(`"${taskArgs.to}" is not a valid address.`);
    }

    const addressesPath = path.join(__dirname, "..", "deployed-addresses.json");
    if (!fs.existsSync(addressesPath)) {
      throw new Error(
        "deployed-addresses.json not found — run npm run deploy:coston2 first."
      );
    }
    const { contracts } = JSON.parse(fs.readFileSync(addressesPath, "utf-8"));
    if (!contracts?.MockFXRP) {
      throw new Error("No MockFXRP address in deployed-addresses.json.");
    }

    const fxrp = await ethers.getContractAt("MockFXRP", contracts.MockFXRP);
    const amountWei = ethers.parseEther(taskArgs.amount);

    console.log(`MockFXRP: ${contracts.MockFXRP}`);
    console.log(`Minting ${taskArgs.amount} FXRP to ${taskArgs.to}...`);

    const tx = await fxrp.mint(taskArgs.to, amountWei);
    await tx.wait();

    const balance = await fxrp.balanceOf(taskArgs.to);
    console.log(
      `Done. ${taskArgs.to} now holds ${ethers.formatEther(balance)} FXRP.`
    );
  });