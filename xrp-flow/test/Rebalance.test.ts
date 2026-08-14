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

const DAY = 24 * 60 * 60;

describe("YieldRouter Rebalance", () => {
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

  describe("rebalance", () => {
    it("should allow rebalancing from Kinetic to Morpho when Morpho has higher APY", async () => {
      // Set Morpho APY higher than Kinetic
      await router.connect(owner).setMockAPY(1, ethers.parseEther("0.10")); // 10% for Morpho
      await router.connect(owner).setMockAPY(0, ethers.parseEther("0.05")); //  5% for Kinetic

      // Deposit 100 FXRP (should go to Morpho since it has higher APY)
      const depositAmount = ethers.parseEther("100");
      await router.connect(user).deposit(depositAmount);

      // Verify deposit went to Morpho
      const userVenue = await router.userVenue(user.address);
      expect(userVenue).to.equal(1); // 1 = Morpho

      // Now make Kinetic have higher APY to trigger rebalance
      await router.connect(owner).setMockAPY(0, ethers.parseEther("0.15")); // 15% for Kinetic
      await router.connect(owner).setMockAPY(1, ethers.parseEther("0.10")); // 10% for Morpho

      // Rebalance should move funds from Morpho to Kinetic
      await expect(router.connect(user).rebalance())
        .to.emit(router, "Rebalanced")
        .withArgs(user.address, depositAmount, 1, 0); // user, amount, fromVenue(Morpho), toVenue(Kinetic)

      // Verify user's venue is now Kinetic
      const newUserVenue = await router.userVenue(user.address);
      expect(newUserVenue).to.equal(0); // 0 = Kinetic

      // Verify YieldRouter balance is 0 (tokens moved to venues)
      const routerBalance = await fxrp.balanceOf(await router.getAddress());
      expect(routerBalance).to.equal(0);
    });

    it("should allow rebalancing from Morpho to Kinetic when Kinetic has higher APY", async () => {
      // Set Kinetic APY higher than Morpho
      await router.connect(owner).setMockAPY(0, ethers.parseEther("0.10")); // 10% for Kinetic
      await router.connect(owner).setMockAPY(1, ethers.parseEther("0.05")); //  5% for Morpho

      // Deposit 100 FXRP (should go to Kinetic since it has higher APY)
      const depositAmount = ethers.parseEther("100");
      await router.connect(user).deposit(depositAmount);

      // Verify deposit went to Kinetic
      const userVenue = await router.userVenue(user.address);
      expect(userVenue).to.equal(0); // 0 = Kinetic

      // Now make Morpho have higher APY to trigger rebalance
      await router.connect(owner).setMockAPY(0, ethers.parseEther("0.05")); //  5% for Kinetic
      await router.connect(owner).setMockAPY(1, ethers.parseEther("0.15")); // 15% for Morpho

      // Rebalance should move funds from Kinetic to Morpho
      await expect(router.connect(user).rebalance())
        .to.emit(router, "Rebalanced")
        .withArgs(user.address, depositAmount, 0, 1); // user, amount, fromVenue(Kinetic), toVenue(Morpho)

      // Verify user's venue is now Morpho
      const newUserVenue = await router.userVenue(user.address);
      expect(newUserVenue).to.equal(1); // 1 = Morpho

      // Verify YieldRouter balance is 0 (tokens moved to venues)
      const routerBalance = await fxrp.balanceOf(await router.getAddress());
      expect(routerBalance).to.equal(0);
    });

    it("should revert when trying to rebalance with insufficient amount (less than 0.01 FXRP)", async () => {
      // Set up APYs so rebalance would be triggered
      await router.connect(owner).setMockAPY(0, ethers.parseEther("0.10")); // 10% for Kinetic
      await router.connect(owner).setMockAPY(1, ethers.parseEther("0.05")); //  5% for Morpho

      // Deposit a very small amount (less than 0.01 FXRP)
      const smallAmount = ethers.parseEther("0.005"); // 0.005 FXRP
      await router.connect(user).deposit(smallAmount);

      // Try to rebalance - should revert with NoRebalanceNeeded
      await expect(router.connect(user).rebalance())
        .to.be.revertedWithCustomError(router, "NoRebalanceNeeded");
    });

    it("should revert when trying to rebalance when already in best venue", async () => {
      // Set Kinetic APY higher than Morpho
      await router.connect(owner).setMockAPY(0, ethers.parseEther("0.10")); // 10% for Kinetic
      await router.connect(owner).setMockAPY(1, ethers.parseEther("0.05")); //  5% for Morpho

      // Deposit 100 FXRP (should go to Kinetic since it has higher APY)
      const depositAmount = ethers.parseEther("100");
      await router.connect(user).deposit(depositAmount);

      // Verify deposit went to Kinetic
      const userVenue = await router.userVenue(user.address);
      expect(userVenue).to.equal(0); // 0 = Kinetic

      // Try to rebalance when already in best venue - should revert with NoRebalanceNeeded
      await expect(router.connect(user).rebalance())
        .to.be.revertedWithCustomError(router, "NoRebalanceNeeded");
    });

    it("should revert when Morpho market is not configured and rebalance requires Morpho", async () => {
      // Deploy a fresh contract with unconfigured Morpho market for this test
      const [ownerLocal, userLocal] = await ethers.getSigners();

      const MockFXRPFactory = await ethers.getContractFactory("MockFXRP");
      const fxrpLocal = await MockFXRPFactory.deploy(INITIAL_MINT);
      await fxrpLocal.waitForDeployment();

      const MockKineticFactory = await ethers.getContractFactory("MockKinetic");
      const kineticLocal = await MockKineticFactory.deploy(await fxrpLocal.getAddress());
      await kineticLocal.waitForDeployment();

      const MockMorphoFactory = await ethers.getContractFactory("MockMorpho");
      const morphoLocal = await MockMorphoFactory.deploy(await fxrpLocal.getAddress());
      await morphoLocal.waitForDeployment();

      const YieldRouterFactory = await ethers.getContractFactory("YieldRouter");
      const routerLocal = await YieldRouterFactory.deploy(
        await fxrpLocal.getAddress(),
        await kineticLocal.getAddress(),
        await morphoLocal.getAddress(),
        ownerLocal.address
      );
      await routerLocal.waitForDeployment();

      // Fund the test user and approve the router to pull FXRP.
      await fxrpLocal.mint(userLocal.address, ethers.parseEther("10000"));
      await fxrpLocal
        .connect(userLocal)
        .approve(await routerLocal.getAddress(), ethers.MaxUint256);

      // Verify Morpho market is not configured (loanToken is zero address)
      const currentParams = await routerLocal.morphoMarketParams();
      expect(currentParams.loanToken).to.equal(ethers.ZeroAddress);

      // Set up APYs so INITIALLY Kinetic has higher APY (so deposit goes to Kinetic)
      await routerLocal.connect(ownerLocal).setMockAPY(0, ethers.parseEther("0.10")); // 10% for Kinetic
      await routerLocal.connect(ownerLocal).setMockAPY(1, ethers.parseEther("0.05")); //  5% for Morpho

      // Deposit 100 FXRP (should go to Kinetic since it has higher APY)
      const depositAmount = ethers.parseEther("100");
      await routerLocal.connect(userLocal).deposit(depositAmount);

      // Verify deposit went to Kinetic
      const userVenue = await routerLocal.userVenue(userLocal.address);
      expect(userVenue).to.equal(0); // 0 = Kinetic

      // NOW change APYs so Morpho has higher APY (requiring Morpho market for rebalance)
      await routerLocal.connect(ownerLocal).setMockAPY(0, ethers.parseEther("0.05")); //  5% for Kinetic
      await routerLocal.connect(ownerLocal).setMockAPY(1, ethers.parseEther("0.10")); // 10% for Morpho

      // Try to rebalance - should revert with MorphoMarketNotConfigured
      await expect(routerLocal.connect(userLocal).rebalance())
        .to.be.revertedWithCustomError(routerLocal, "MorphoMarketNotConfigured");
    });
  });
});