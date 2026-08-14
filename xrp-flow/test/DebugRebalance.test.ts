import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import {
  YieldRouter,
  MockFXRP,
  MockKinetic,
  MockMorpho,
} from "../typechain-types";

describe("Debug YieldRouter Rebalance", () => {
  let owner: HardhatEthersSigner;
  let user: HardhatEthersSigner;

  let fxrp: MockFXRP;
  let kinetic: MockKinetic;
  let morpho: MockMorpho;
  let router: YieldRouter;

  const INITIAL_MINT = ethers.parseEther("1000000");

  async function deployFixture() {
    [owner, user] = await ethers.getSigners();

    const MockFXRPFactory = await ethers.getContractFactory("MockFXRP");
    fxrp = await MockFXRPFactory.deploy(INITIAL_MINT);
    await fxrp.waitForDeployment();

    const MockKineticFactory = await ethers.getContractFactory("MockKinetic");
    kinetic = await MockKineticFactory.deploy(await fxrp.getAddress());
    await kinetic.waitForDeployment();

    const MockMorphoFactory = await ethers.getContractFactory("MockMorpho");
    morpho = await MockMorphoFactory.deploy(await fxrp.getAddress());
    await morpho.waitForDeployment();

    const YieldRouterFactory = await ethers.getContractFactory("YieldRouter");
    router = await YieldRouterFactory.deploy(
      await fxrp.getAddress(),
      await kinetic.getAddress(),
      await morpho.getAddress(),
      owner.address
    );
    await router.waitForDeployment();

    // Fund the test user and approve the router to pull FXRP.
    await fxrp.mint(user.address, ethers.parseEther("10000"));
    await fxrp
      .connect(user)
      .approve(await router.getAddress(), ethers.MaxUint256);

    // Configure Morpho market (using FXRP as both loan and collateral for simplicity)
    await router
      .connect(owner)
      .setMorphoMarketParams({
        loanToken: await fxrp.getAddress(),
        collateralToken: await fxrp.getAddress(),
        oracle: ethers.ZeroAddress,
        irm: ethers.ZeroAddress,
        lltv: 0n,
      });
  }

  beforeEach(async () => {
    await deployFixture();
  });

  describe("debug rebalance", () => {
    it("should trace token balances during rebalance", async () => {
      // Set Morpho APY higher than Kinetic
      await router.connect(owner).setMockAPY(1, ethers.parseEther("0.10")); // 10% for Morpho
      await router.connect(owner).setMockAPY(0, ethers.parseEther("0.05")); //  5% for Kinetic

      console.log("Initial state:");
      const initialUserFXRP = await fxrp.balanceOf(user.address);
      const initialRouterFXRP = await fxrp.balanceOf(await router.getAddress());
      const initialKineticSupply = await kinetic.supplied(await router.getAddress());
      const initialMorphoSupply = await morpho.supplied(await router.getAddress());

      console.log(`  User FXRP: ${initialUserFXRP.toString()}`);
      console.log(`  Router FXRP: ${initialRouterFXRP.toString()}`);
      console.log(`  Router in Kinetic: ${initialKineticSupply.toString()}`);
      console.log(`  Router in Morpho: ${initialMorphoSupply.toString()}`);

      // Deposit 100 FXRP (should go to Morpho since it has higher APY)
      const depositAmount = ethers.parseEther("100");
      console.log(`\nDepositing ${depositAmount.toString()} FXRP...`);
      await router.connect(user).deposit(depositAmount);

      console.log("After deposit:");
      const afterDepositUserFXRP = await fxrp.balanceOf(user.address);
      const afterDepositRouterFXRP = await fxrp.balanceOf(await router.getAddress());
      const afterDepositKineticSupply = await kinetic.supplied(await router.getAddress());
      const afterDepositMorphoSupply = await morpho.supplied(await router.getAddress());
      const userVenue = await router.userVenue(user.address);

      console.log(`  User FXRP: ${afterDepositUserFXRP.toString()}`);
      console.log(`  Router FXRP: ${afterDepositRouterFXRP.toString()}`);
      console.log(`  Router in Kinetic: ${afterDepositKineticSupply.toString()}`);
      console.log(`  Router in Morpho: ${afterDepositMorphoSupply.toString()}`);
      console.log(`  User venue: ${userVenue}`);

      // Verify deposit went to Morpho
      expect(userVenue).to.equal(1); // 1 = Morpho

      // Now make Kinetic have higher APY to trigger rebalance
      await router.connect(owner).setMockAPY(0, ethers.parseEther("0.15")); // 15% for Kinetic
      await router.connect(owner).setMockAPY(1, ethers.parseEther("0.10")); // 10% for Morpho

      console.log("\nAfter changing APYs (Kinetic now higher):");
      const afterApyChangeUserFXRP = await fxrp.balanceOf(user.address);
      const afterApyChangeRouterFXRP = await fxrp.balanceOf(await router.getAddress());
      const afterApyChangeKineticSupply = await kinetic.supplied(await router.getAddress());
      const afterApyChangeMorphoSupply = await morpho.supplied(await router.getAddress());

      console.log(`  User FXRP: ${afterApyChangeUserFXRP.toString()}`);
      console.log(`  Router FXRP: ${afterApyChangeRouterFXRP.toString()}`);
      console.log(`  Router in Kinetic: ${afterApyChangeKineticSupply.toString()}`);
      console.log(`  Router in Morpho: ${afterApyChangeMorphoSupply.toString()}`);

      // Rebalance should move funds from Morpho to Kinetic
      console.log("\nCalling rebalance...");
      await expect(router.connect(user).rebalance())
        .to.emit(router, "Rebalanced")
        .withArgs(user.address, depositAmount, 1, 0); // user, amount, fromVenue(Morpho), toVenue(Kinetic)

      console.log("After rebalance:");
      const afterRebalanceUserFXRP = await fxrp.balanceOf(user.address);
      const afterRebalanceRouterFXRP = await fxrp.balanceOf(await router.getAddress());
      const afterRebalanceKineticSupply = await kinetic.supplied(await router.getAddress());
      const afterRebalanceMorphoSupply = await morpho.supplied(await router.getAddress());
      const newUserVenue = await router.userVenue(user.address);

      console.log(`  User FXRP: ${afterRebalanceUserFXRP.toString()}`);
      console.log(`  Router FXRP: ${afterRebalanceRouterFXRP.toString()}`);
      console.log(`  Router in Kinetic: ${afterRebalanceKineticSupply.toString()}`);
      console.log(`  Router in Morpho: ${afterRebalanceMorphoSupply.toString()}`);
      console.log(`  User venue: ${newUserVenue}`);

      // Verify user's venue is now Kinetic
      expect(newUserVenue).to.equal(0); // 0 = Kinetic

      // Verify YieldRouter balance is 0 (tokens moved to venues)
      expect(afterRebalanceRouterFXRP).to.equal(0);
    });
  });
});