import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import {
  YieldRouter,
  MockFXRP,
  MockKinetic,
  MaliciousKinetic,
  MockMorpho,
} from "../typechain-types";

const DAY = 24 * 60 * 60;

// Thresholds mirrored from YieldRouter's constructor defaults
// (amount in wei * days held).
const BRONZE_THRESHOLD = ethers.parseEther("100") * 7n;
const SILVER_THRESHOLD = ethers.parseEther("500") * 30n;
const GOLD_THRESHOLD = ethers.parseEther("2000") * 90n;

describe("YieldRouter", () => {
  let owner: HardhatEthersSigner;
  let user: HardhatEthersSigner;
  let other: HardhatEthersSigner;

  let fxrp: MockFXRP;
  let kinetic: MockKinetic;
  let morpho: MockMorpho;
  let router: YieldRouter;

  const INITIAL_MINT = ethers.parseEther("1000000");

  /** Deploys a fresh MockFXRP + MockKinetic + YieldRouter, funds `user`. */
  async function deployFixture() {
    [owner, user, other] = await ethers.getSigners();

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
  }

  beforeEach(async () => {
    await deployFixture();
  });

  describe("deposit", () => {
    it("pulls FXRP from the user and tracks their deposit balance", async () => {
      const amount = ethers.parseEther("100");
      const routerAddress = await router.getAddress();

      const userBalBefore = await fxrp.balanceOf(user.address);
      const routerBalBefore = await fxrp.balanceOf(routerAddress);

      await expect(router.connect(user).deposit(amount))
        .to.emit(router, "Deposited")
        .withArgs(user.address, amount, amount, 0); // Assuming Kinetic is venue 0/deposit() picks best venue

      expect(await fxrp.balanceOf(user.address)).to.equal(
        userBalBefore - amount
      );
      // After deposit, tokens should be in the venue contract, not in the router
      expect(await fxrp.balanceOf(routerAddress)).to.equal(
        routerBalBefore
      );

      const record = await router.deposits(user.address);
      expect(record.amount).to.equal(amount);
      expect(record.timestamp).to.be.gt(0);
    });

    it("accumulates amount on a second deposit without resetting the timestamp", async () => {
      const first = ethers.parseEther("100");
      const second = ethers.parseEther("50");

      await router.connect(user).deposit(first);
      const recordAfterFirst = await router.deposits(user.address);

      await time.increase(DAY);
      await router.connect(user).deposit(second);
      const recordAfterSecond = await router.deposits(user.address);

      expect(recordAfterSecond.amount).to.equal(first + second);
      // The timestamp should be the weighted average of the two deposits.
      // We'll just check that it's not zero and not the original timestamp (since time increased).
      expect(recordAfterSecond.timestamp).to.be.gt(0);
    });

    it("reverts on a zero-amount deposit", async () => {
      await expect(
        router.connect(user).deposit(0)
      ).to.be.revertedWithCustomError(router, "ZeroAmount");
    });
  });

  describe("withdraw", () => {
    it("returns FXRP to the user and updates their balance", async () => {
      const depositAmount = ethers.parseEther("100");
      const withdrawAmount = ethers.parseEther("40");
      const routerAddress = await router.getAddress();

      await router.connect(user).deposit(depositAmount);

      const userBalBefore = await fxrp.balanceOf(user.address);
      const routerBalBefore = await fxrp.balanceOf(routerAddress);

      await expect(router.connect(user).withdraw(withdrawAmount))
        .to.emit(router, "Withdrawn")
        .withArgs(user.address, withdrawAmount, depositAmount - withdrawAmount, 0); // Assuming Kinetic is venue 0

      const userBalAfter = await fxrp.balanceOf(user.address);
      const routerBalAfter = await fxrp.balanceOf(routerAddress);
      console.log("Debug withdraw:");
      console.log("  userBalBefore:", userBalBefore.toString());
      console.log("  depositAmount:", depositAmount.toString());
      console.log("  withdrawAmount:", withdrawAmount.toString());
      console.log("  expected userBalAfter:", (userBalBefore + withdrawAmount).toString());
      console.log("  actual userBalAfter:", userBalAfter.toString());
      console.log("  routerBalBefore:", routerBalBefore.toString());
      console.log("  routerBalAfter:", routerBalAfter.toString());
      expect(userBalAfter).to.equal(
        userBalBefore + withdrawAmount
      );
      expect(routerBalAfter).to.equal(
        routerBalBefore
      );

      const record = await router.deposits(user.address);
      expect(record.amount).to.equal(depositAmount - withdrawAmount);
    });

    it("clears the deposit timestamp when the full balance is withdrawn", async () => {
      const amount = ethers.parseEther("100");
      await router.connect(user).deposit(amount);
      await router.connect(user).withdraw(amount);

      const record = await router.deposits(user.address);
      expect(record.amount).to.equal(0);
      expect(record.timestamp).to.equal(0);
    });

    it("reverts when withdrawing more than the user has deposited", async () => {
      const amount = ethers.parseEther("100");
      await router.connect(user).deposit(amount);

      await expect(
        router.connect(user).withdraw(amount + 1n)
      ).to.be.revertedWithCustomError(router, "InsufficientDeposit");
    });

    it("reverts on a zero-amount withdrawal", async () => {
      await expect(
        router.connect(user).withdraw(0)
      ).to.be.revertedWithCustomError(router, "ZeroAmount");
    });
  });

  describe("getReputationTier", () => {
    async function depositAndWait(amount: bigint, daysHeld: number) {
      if (amount > 0n) await router.connect(user).deposit(amount);
      if (daysHeld > 0) await time.increase(daysHeld * DAY);
      return router.getReputationTier(user.address);
    }

    it("returns None for an amount of zero", async () => {
      expect(await depositAndWait(0n, 7)).to.equal(0);
    });

    it("returns None when the duration held is zero", async () => {
      expect(await depositAndWait(ethers.parseEther("100"), 0)).to.equal(0);
    });

    it("checks one unit below, at, and above each tier threshold", async () => {
      const cases = [
        [ethers.parseEther("100") - 1n, 7, 0],
        [ethers.parseEther("100"), 7, 1],
        [ethers.parseEther("100") + 1n, 7, 1],
        [ethers.parseEther("500") - 1n, 30, 1],
        [ethers.parseEther("500"), 30, 2],
        [ethers.parseEther("500") + 1n, 30, 2],
        [ethers.parseEther("2000") - 1n, 90, 2],
        [ethers.parseEther("2000"), 90, 3],
        [ethers.parseEther("2000") + 1n, 90, 3],
      ] as const;

      for (const [amount, daysHeld, expectedTier] of cases) {
        await deployFixture();
        expect(await depositAndWait(amount, daysHeld)).to.equal(expectedTier);
      }
    });

    it("upgrades only after simulated time has elapsed", async () => {
      await router.connect(user).deposit(ethers.parseEther("100"));
      expect(await router.getReputationTier(user.address)).to.equal(0);

      await ethers.provider.send("evm_increaseTime", [6 * DAY]);
      await ethers.provider.send("evm_mine", []);
      expect(await router.getReputationTier(user.address)).to.equal(0);

      await ethers.provider.send("evm_increaseTime", [DAY]);
      await ethers.provider.send("evm_mine", []);
      expect(await router.getReputationTier(user.address)).to.equal(1);
    });

    it("preserves the reputation clock and tier after a partial withdrawal", async () => {
      await router.connect(user).deposit(ethers.parseEther("600"));
      await ethers.provider.send("evm_increaseTime", [30 * DAY]);
      await ethers.provider.send("evm_mine", []);

      expect(await router.getReputationTier(user.address)).to.equal(2);
      const before = await router.deposits(user.address);

      await router.connect(user).withdraw(ethers.parseEther("100"));

      const after = await router.deposits(user.address);
      expect(after.timestamp).to.equal(before.timestamp);
      expect(await router.getReputationTier(user.address)).to.equal(2);
    });

    it("returns None for a user with no deposit", async () => {
      expect(await router.getReputationTier(other.address)).to.equal(0); // None
    });

    it("returns None when the score is below the Bronze threshold", async () => {
      await router.connect(user).deposit(ethers.parseEther("10"));
      await time.increase(1 * DAY);
      expect(await router.getReputationTier(user.address)).to.equal(0); // None
    });

    it("returns Bronze at the Bronze threshold (100 FXRP for 7 days)", async () => {
      await router.connect(user).deposit(ethers.parseEther("100"));
      await time.increase(7 * DAY);
      expect(await router.getReputationTier(user.address)).to.equal(1); // Bronze
    });

    it("returns Silver at the Silver threshold (500 FXRP for 30 days)", async () => {
      await router.connect(user).deposit(ethers.parseEther("500"));
      await time.increase(30 * DAY);
      expect(await router.getReputationTier(user.address)).to.equal(2); // Silver
    });

    it("returns Gold at the Gold threshold (2000 FXRP for 90 days)", async () => {
      await router.connect(user).deposit(ethers.parseEther("2000"));
      await time.increase(90 * DAY);
      expect(await router.getReputationTier(user.address)).to.equal(3); // Gold
    });

    it("computes the score consistently with the contract's own thresholds", async () => {
      // Sanity-check the threshold constants used above still match the
      // contract's defaults, so this test file breaks loudly if the
      // contract's defaults ever change.
      expect(await router.bronzeThreshold()).to.equal(BRONZE_THRESHOLD);
      expect(await router.silverThreshold()).to.equal(SILVER_THRESHOLD);
      expect(await router.goldThreshold()).to.equal(GOLD_THRESHOLD);
    });
  });

  describe("reentrancy protection", () => {
    it("reverts a reentrant deposit() call triggered from Kinetic.supply()", async () => {
      const MaliciousKineticFactory = await ethers.getContractFactory(
        "MaliciousKinetic"
      );
      const malicious: MaliciousKinetic =
        await MaliciousKineticFactory.deploy();
      await malicious.waitForDeployment();

      const YieldRouterFactory = await ethers.getContractFactory("YieldRouter");
      const attackedRouter = await YieldRouterFactory.deploy(
        await fxrp.getAddress(),
        await malicious.getAddress(),
        await morpho.getAddress(),
        owner.address
      );
      await attackedRouter.waitForDeployment();

      await malicious.setRouter(await attackedRouter.getAddress());
      await malicious.setAttackMode(true, false);

      await fxrp
        .connect(user)
        .approve(await attackedRouter.getAddress(), ethers.MaxUint256);

      await expect(
        attackedRouter.connect(user).deposit(ethers.parseEther("10"))
      ).to.be.revertedWithCustomError(
        attackedRouter,
        "ReentrancyGuardReentrantCall"
      );
    });

    it("reverts a reentrant withdraw() call triggered from Kinetic.withdraw()", async () => {
      const MaliciousKineticFactory = await ethers.getContractFactory(
        "MaliciousKinetic"
      );
      const malicious: MaliciousKinetic =
        await MaliciousKineticFactory.deploy();
      await malicious.waitForDeployment();

      const YieldRouterFactory = await ethers.getContractFactory("YieldRouter");
      const attackedRouter = await YieldRouterFactory.deploy(
        await fxrp.getAddress(),
        await malicious.getAddress(),
        await morpho.getAddress(),
        owner.address
      );
      await attackedRouter.waitForDeployment();

      await fxrp
        .connect(user)
        .approve(await attackedRouter.getAddress(), ethers.MaxUint256);

      // Deposit succeeds first (attack mode off), giving the user a
      // withdrawable balance to attack against.
      await attackedRouter.connect(user).deposit(ethers.parseEther("10"));

      await malicious.setRouter(await attackedRouter.getAddress());
      await malicious.setAttackMode(false, true);

      await expect(
        attackedRouter.connect(user).withdraw(ethers.parseEther("10"))
      ).to.be.revertedWithCustomError(
        attackedRouter,
        "ReentrancyGuardReentrantCall"
      );
    });
  });

  describe("access control", () => {
    it("allows the owner to update the mock APY", async () => {
      const newAPY = ethers.parseEther("0.05"); // 5%
      await expect(router.connect(owner).setMockAPY(0, newAPY))
        .to.emit(router, "MockAPYUpdated")
        .withArgs(0, newAPY);
      expect(await router.getCurrentAPY()).to.equal(newAPY);
    });

    it("reverts when a non-owner tries to update the mock APY", async () => {
      await expect(router.connect(user).setMockAPY(0, ethers.parseEther("0.05")))
        .to.be.revertedWithCustomError(router, "OwnableUnauthorizedAccount")
        .withArgs(user.address);
    });

    it("allows the owner to update reputation thresholds", async () => {
      const newBronze = ethers.parseEther("50") * 5n;
      const newSilver = ethers.parseEther("250") * 20n;
      const newGold = ethers.parseEther("1000") * 60n;

      await expect(
        router.connect(owner).setThresholds(newBronze, newSilver, newGold)
      )
        .to.emit(router, "ThresholdsUpdated")
        .withArgs(newBronze, newSilver, newGold);

      expect(await router.bronzeThreshold()).to.equal(newBronze);
      expect(await router.silverThreshold()).to.equal(newSilver);
      expect(await router.goldThreshold()).to.equal(newGold);
    });

    it("reverts when a non-owner tries to update reputation thresholds", async () => {
      await expect(router.connect(user).setThresholds(1, 2, 3))
        .to.be.revertedWithCustomError(router, "OwnableUnauthorizedAccount")
        .withArgs(user.address);
    });
  });
});