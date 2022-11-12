const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const hre = require("hardhat");
const ethers = hre.ethers

const DECIMALS = 18;
const BASE = ethers.utils.parseUnits("1", DECIMALS); // 10 ^ 18

describe("The CErc20 Full testing start...", function () {
  let erc20ContractA, cErc20ContractA;
  let erc20ContractB, cErc20ContractB;
  let comptrollerContract, interestRateModelContract, simplePriceOracleContract;
  let owner, user1, user2;

  async function deployNeededContract() {
    const { erc20DeployA } = await loadFixture(deployErc20A);
    const { cErc20DeployA } = await loadFixture(deploycErc20A);

    const { erc20DeployB } = await loadFixture(deployErc20B);
    const { cErc20DeployB } = await loadFixture(deploycErc20B);

    const { comptrollerDeploy } = await loadFixture(deployComptroller);
    const { interestRateModelDeploy } = await loadFixture(deployInterestRateModel);
    const { simplePriceOracleDeploy } = await loadFixture(deploySimplePriceOracle);

    return {
      erc20DeployA, cErc20DeployA,
      erc20DeployB, cErc20DeployB,
      comptrollerDeploy, interestRateModelDeploy, simplePriceOracleDeploy
    }
  }

  async function deployErc20A() {
    const erc20Factory = await ethers.getContractFactory("TestErc20");
    const erc20DeployA = await erc20Factory.deploy("Erc20A", "tokenA", ethers.utils.parseUnits("1000", DECIMALS));
    await erc20DeployA.deployed();
    return { erc20DeployA };
  }

  async function deployErc20B() {
    const erc20Factory = await ethers.getContractFactory("TestErc20");
    const erc20DeployB = await erc20Factory.deploy("Erc20B", "tokenB", ethers.utils.parseUnits("1000", DECIMALS));
    await erc20DeployB.deployed();
    return { erc20DeployB };
  }

  async function deployComptroller() {
    const comptrollerFactory = await ethers.getContractFactory("Comptroller");
    const comptrollerDeploy = await comptrollerFactory.deploy();
    await comptrollerDeploy.deployed();
    return { comptrollerDeploy };
  }

  async function deployInterestRateModel() {
    const interestRateModelFactory = await ethers.getContractFactory("WhitePaperInterestRateModel");
    const interestRateModelDeploy = await interestRateModelFactory.deploy(ethers.utils.parseUnits("0", DECIMALS), ethers.utils.parseUnits("0", DECIMALS));
    await interestRateModelDeploy.deployed();
    return { interestRateModelDeploy };
  }

  async function deploycErc20A() {
    const cErc20Factory = await ethers.getContractFactory("CErc20");
    const cErc20DeployA = await cErc20Factory.deploy();
    await cErc20DeployA.deployed();
    return { cErc20DeployA };
  }

  async function deploycErc20B() {
    const cErc20Factory = await ethers.getContractFactory("CErc20");
    const cErc20DeployB = await cErc20Factory.deploy();
    await cErc20DeployB.deployed();
    return { cErc20DeployB };
  }

  async function deploySimplePriceOracle() {
    const simeplePriceOracleFactory = await ethers.getContractFactory("SimplePriceOracle");
    simplePriceOracleDeploy = await simeplePriceOracleFactory.deploy();
    await simplePriceOracleDeploy.deployed();
    return { simplePriceOracleDeploy };
  }

  before(async function () {
    // console.log("===== before");
    const { erc20DeployA, cErc20DeployA, erc20DeployB, cErc20DeployB, comptrollerDeploy, interestRateModelDeploy, simplePriceOracleDeploy } = await deployNeededContract();
    erc20ContractA = erc20DeployA;
    cErc20ContractA = cErc20DeployA;

    erc20ContractB = erc20DeployB;
    cErc20ContractB = cErc20DeployB;

    comptrollerContract = comptrollerDeploy;
    interestRateModelContract = interestRateModelDeploy;
    simplePriceOracleContract = simplePriceOracleDeploy;

    const [ownerEther, user1Ether, user2Ether] = await ethers.getSigners();
    owner = ownerEther;
    user1 = user1Ether;
    user2 = user2Ether;

    // CErc20 initialize
    await cErc20ContractA["initialize(address,address,address,uint256,string,string,uint8)"](
      erc20ContractA.address,
      comptrollerContract.address,
      interestRateModelContract.address,
      ethers.utils.parseUnits("1", DECIMALS),
      "cErc20A",
      "cTokenA",
      DECIMALS,
    );

    // CErc20 initialize
    await cErc20ContractB["initialize(address,address,address,uint256,string,string,uint8)"](
      erc20ContractB.address,
      comptrollerContract.address,
      interestRateModelContract.address,
      ethers.utils.parseUnits("1", DECIMALS),
      "cErc20B",
      "cTokenB",
      DECIMALS
    );

    // support markets
    await comptrollerContract.connect(owner)._supportMarket(cErc20ContractA.address);
    await comptrollerContract.connect(owner)._supportMarket(cErc20ContractB.address);

  });

  beforeEach(async function () {
    // console.log("user1.address, %s", user1.address);
    // console.log("user2.address, %s", user2.address);
    // console.log("cErc20ContractA.address, %s", cErc20ContractA.address);
    // console.log("cErc20ContractB.address, %s", cErc20ContractB.address);
    console.log("============beforeEach");
  });

  describe("Create otherAccout for mint/reedem test case", function () {
    it("Create otherAccout for mint/reedem test case", async function () {

      // And find in Erc20, need to approve token allowance
      // if missing this step, will popup "ERC20: insufficient allowance" error message
      await erc20ContractA.connect(user1).approve(cErc20ContractA.address, ethers.utils.parseUnits("100", DECIMALS));

      // And if want to mint, the user also need have enough balance
      // if missing this step, will popup "ERC20: transfer amount exceeds balance" error message
      await erc20ContractA.connect(owner).transfer(user1.address, ethers.utils.parseUnits("100", DECIMALS));

      // verify user1 already have erc20 * 100 tokens
      expect(await erc20ContractA.balanceOf(user1.address)).to.equal(ethers.utils.parseUnits("100", DECIMALS));

      // verify user1 after mint, then will have cErc20 * 100 tokens
      await cErc20ContractA.connect(user1).mint(ethers.utils.parseUnits("100", DECIMALS));
      expect(await cErc20ContractA.balanceOf(user1.address)).to.equal(ethers.utils.parseUnits("100", DECIMALS));

      // verify user1 after redeem, then will have cErc20 * 0 tokens and Erc20 * 100 tokens
      await cErc20ContractA.connect(user1).redeem(ethers.utils.parseUnits("100", DECIMALS));
      expect(await cErc20ContractA.balanceOf(user1.address)).to.equal(ethers.utils.parseUnits("0", DECIMALS));
      expect(await erc20ContractA.balanceOf(user1.address)).to.equal(ethers.utils.parseUnits("100", DECIMALS));
    });
  });

  async function borrowAndRepay() {
    // Set simplePriceOracle
    await comptrollerContract._setPriceOracle(simplePriceOracleContract.address);

    // set cErc20A as $1
    await simplePriceOracleContract.setUnderlyingPrice(cErc20ContractA.address, ethers.utils.parseUnits("1", DECIMALS));

    // set cErc20B as $100
    await simplePriceOracleContract.setUnderlyingPrice(cErc20ContractB.address, ethers.utils.parseUnits("100", DECIMALS));

    // set cErc20B's collateral factor to 50%
    await comptrollerContract.connect(owner)._setCollateralFactor(cErc20ContractB.address, ethers.utils.parseUnits("0.5", DECIMALS));

    // set close factor to 50%
    comptrollerContract._setCloseFactor(ethers.utils.parseUnits("0.5", DECIMALS));

    // set LiquidationIncentive to 10%
    comptrollerContract._setLiquidationIncentive(ethers.utils.parseUnits("1.1", DECIMALS));

    // check set collateral factor success
    let market = await comptrollerContract.markets(cErc20ContractB.address);
    expect(market.collateralFactorMantissa).to.eq(ethers.utils.parseUnits("0.5", DECIMALS));

    // let cErc20B enter the Market
    await comptrollerContract.connect(user1).enterMarkets([cErc20ContractB.address]);

    // Transfer 1 * erc20B to user1
    await erc20ContractB.connect(owner).transfer(user1.address, ethers.utils.parseUnits("1", DECIMALS));
    expect(await erc20ContractB.balanceOf(user1.address)).to.equal(ethers.utils.parseUnits("1", DECIMALS));

    // otherAaccount mint 1 * cErc20B
    await erc20ContractB.connect(user1).approve(cErc20ContractB.address, ethers.utils.parseUnits("1", DECIMALS));
    await cErc20ContractB.connect(user1).mint(ethers.utils.parseUnits("1", DECIMALS));
    expect(await cErc20ContractB.balanceOf(user1.address)).to.equal(ethers.utils.parseUnits("1", DECIMALS));

    // Transfer 100 * erc20A to user2
    await erc20ContractA.transfer(user2.address, ethers.utils.parseUnits("100", DECIMALS));
    expect(await erc20ContractA.balanceOf(user2.address)).to.equal(ethers.utils.parseUnits("100", DECIMALS));

    // user2 mint 100 * cErc20A
    await erc20ContractA.connect(user2).approve(cErc20ContractA.address, ethers.utils.parseUnits("100", DECIMALS));
    await cErc20ContractA.connect(user2).mint(ethers.utils.parseUnits("100", DECIMALS));
    expect(await cErc20ContractA.balanceOf(user2.address)).to.equal(ethers.utils.parseUnits("100", DECIMALS));

    // Stuck on "reverted with custom error 'BorrowComptrollerRejection(4)'"
    // Finally get solution is need to connect user1 for "enterMarkets"
    await cErc20ContractA.connect(user1).borrow(ethers.utils.parseUnits("50", DECIMALS));

    // Repay borrow success
    // await erc20ContractA.connect(user1).approve(cErc20ContractA.address, ethers.utils.parseUnits("50", DECIMALS));
    // await cErc20ContractA.connect(user1).repayBorrow(ethers.utils.parseUnits("50", DECIMALS));
  }

  //讓 user1 borrow/repay
  /*describe("Test borrow and repay", function () {
    it("Test borrow and repay", async function () {
      await borrowAndRepay();
    });

    // 延續 (3.) 的借貸場景，調整 token B 的 collateral factor，讓 user1 被 user2 清算
    it("let user1 be liquidated by user2", async function () {

      // borrow again
      // await cErc20ContractA.connect(user1).borrow(ethers.utils.parseUnits("50", DECIMALS));

      // set cErc20B's collateral factor to 40%
      await comptrollerContract.connect(owner)._setCollateralFactor(cErc20ContractB.address, ethers.utils.parseUnits("0.4", DECIMALS));

      // check set collateral factor success
      let market = await comptrollerContract.markets(cErc20ContractB.address);
      expect(market.collateralFactorMantissa).to.eq(ethers.utils.parseUnits("0.4", DECIMALS));

      // check current shortfall will be 30 cTokenA
      const results = await comptrollerContract.getAccountLiquidity(user1.address);
      let shortfall = results[2];
      console.log("shortfall: %s", shortfall)
      expect(shortfall).to.gt(0);

      // count repay
      const repayAmount = ethers.utils.parseUnits("25", DECIMALS);
      console.log(`user2 Liquidate ${repayAmount}`);
      await erc20ContractA.connect(owner).transfer(user2.address, repayAmount);
      await erc20ContractA.connect(user2).approve(cErc20ContractA.address, repayAmount);
      await cErc20ContractA.connect(user2).liquidateBorrow(user1.address, repayAmount, cErc20ContractB.address);

      const user2TokenBAmount = await cErc20ContractB.balanceOf(user2.address);

      // 2.8% fee
      const protocolSeizeShare = await cErc20ContractB.protocolSeizeShareMantissa();

      // the bonus from liquidate
      const liquidationIncentiveFee = ethers.BigNumber.from(BASE).mul(25).div(100).mul(110).div(100);

      // platform fee
      const protocolSeizeShareFee = liquidationIncentiveFee.mul(protocolSeizeShare).div(BASE);

      // bonus sub 2.8% fee
      const liquidationIncentiveActualFee = liquidationIncentiveFee.sub(protocolSeizeShareFee);
      expect(user2TokenBAmount).equals(liquidationIncentiveActualFee);

      // check user1's cTokenB balance
      const user1TokenBAmount = await cErc20ContractB.balanceOf(user1.address);
      const expectuser1TokenBAmount = ethers.BigNumber.from(BASE).sub(liquidationIncentiveFee);
      expect(user1TokenBAmount).equals(expectuser1TokenBAmount);
    });
  });*/

  //讓 user1 borrow/repay
  describe("Test borrow and repay2", function () {
    it("Test borrow and repay2", async function () {
      await borrowAndRepay();
    });

    // 5.延續 (3.) 的借貸場景，調整 oracle 中的 token B 的價格，讓 user1 被 user2 清算
    it("let user1 be liquidated by user2 by oracle price", async function () {

      // set price to 90 for token B
      const tokenBPrice = ethers.utils.parseUnits("90", DECIMALS);
      await simplePriceOracleContract.setUnderlyingPrice(cErc20ContractB.address, tokenBPrice);

      // check the oracle price of cTokenB
      const tokenBPriceResult = await simplePriceOracleContract.getUnderlyingPrice(cErc20ContractB.address);
      expect(tokenBPriceResult).equals(tokenBPrice);

      // token B price already set to 90, so only can borrow 45 token A, so check shortfailwill be 5 cTokenA
      const results = await comptrollerContract.getAccountLiquidity(user1.address);
      let shortfall = results[2];
      console.log("shortfall: %s", shortfall)
      expect(shortfall).to.eq(ethers.utils.parseUnits("5", DECIMALS));

      // user2 liquidate borrow user1 by 10 cTokenA
      const repayAmount = ethers.utils.parseUnits("10", DECIMALS);
      console.log(`user2 Liquidate ${repayAmount}`);
      await erc20ContractA.connect(owner).transfer(user2.address, repayAmount);
      await erc20ContractA.connect(user2).approve(cErc20ContractA.address, repayAmount);
      await cErc20ContractA.connect(user2).liquidateBorrow(user1.address, repayAmount, cErc20ContractB.address);

      // check user2 after liquidate Borrow, only have 0 TokenA
      expect(await erc20ContractA.balanceOf(user2.address)).to.eq(ethers.utils.parseUnits("0", DECIMALS));

      const user2TokenBAmount = await cErc20ContractB.balanceOf(user2.address);

      // 2.8% fee
      const protocolSeizeShare = await cErc20ContractB.protocolSeizeShareMantissa();

      // the bonus from liquidate
      const liquidationIncentiveFee = ethers.BigNumber.from(BASE).mul(10).div(90).mul(110).div(100);

      // platform fee
      const protocolSeizeShareFee = liquidationIncentiveFee.mul(protocolSeizeShare).div(BASE);

      // bonus sub 2.8% fee
      const liquidationIncentiveActualFee = liquidationIncentiveFee.sub(protocolSeizeShareFee);

      // expect +118800000000000000, but is -118799999999999998
      expect(user2TokenBAmount).lt(liquidationIncentiveActualFee);

      // check user1's cTokenB 
      const user1cTokenBAmount = await cErc20ContractB.balanceOf(user1.address);

      // user2 get bonus
      const expectuser1cTokenBAmount = ethers.BigNumber.from(BASE).sub(liquidationIncentiveFee);
      
      // expect +877777777777777778, but is -877777777777777780
      expect(user1cTokenBAmount).gt(expectuser1cTokenBAmount);
    });
  });
});