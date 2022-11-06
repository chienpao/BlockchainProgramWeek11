const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const hre = require("hardhat");
const ethers = hre.ethers

describe("The CErc20 Full testing start...", function () {
  const DECIMAL = 10n ** 18n;

  let erc20ContractA, cErc20ContractA;
  let erc20ContractB, cErc20ContractB;
  let comptrollerContract, interestRateModelContract, simplePriceOracleContract;
  let owner, otherAccount, otherAccount2;

  async function deployNeededContract(){
    const {erc20DeployA} = await loadFixture(deployErc20A);
    const {cErc20DeployA} = await loadFixture(deploycErc20A);

    const {erc20DeployB} = await loadFixture(deployErc20B);
    const {cErc20DeployB} = await loadFixture(deploycErc20B);

    const {comptrollerDeploy} = await loadFixture(deployComptroller);
    const {interestRateModelDeploy} = await loadFixture(deployInterestRateModel);
    const {simplePriceOracleDeploy} = await loadFixture(deploySimplePriceOracle);
    
    return {erc20DeployA, cErc20DeployA,
            erc20DeployB, cErc20DeployB,
            comptrollerDeploy, interestRateModelDeploy, simplePriceOracleDeploy}
  }

  async function deployErc20A() {
    const erc20Factory = await ethers.getContractFactory("TestErc20");
    const erc20DeployA = await erc20Factory.deploy("Erc20A", "tokenA", ethers.utils.parseUnits("1000", 18));
    await erc20DeployA.deployed();
    return { erc20DeployA };
  }

  async function deployErc20B() {
    const erc20Factory = await ethers.getContractFactory("TestErc20");
    const erc20DeployB = await erc20Factory.deploy("Erc20B", "tokenB", ethers.utils.parseUnits("1000", 18));
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
    const interestRateModelDeploy = await interestRateModelFactory.deploy(ethers.utils.parseUnits("0", 18), ethers.utils.parseUnits("0", 18));
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
    const {erc20DeployA, cErc20DeployA, erc20DeployB, cErc20DeployB, comptrollerDeploy, interestRateModelDeploy, simplePriceOracleDeploy} = await deployNeededContract();
    erc20ContractA = erc20DeployA;
    cErc20ContractA = cErc20DeployA;

    erc20ContractB = erc20DeployB;
    cErc20ContractB = cErc20DeployB;

    comptrollerContract = comptrollerDeploy;
    interestRateModelContract = interestRateModelDeploy;
    simplePriceOracleContract = simplePriceOracleDeploy;

    const [ownerEther, otherAccountEther, otherAccountEther2] = await ethers.getSigners();
    owner = ownerEther;
    otherAccount = otherAccountEther;
    otherAccount2 = otherAccountEther2;
  });

  beforeEach(async function () {
    console.log("otherAccount.address, %s", otherAccount.address);
    console.log("otherAccount2.address, %s", otherAccount2.address);
    console.log("cErc20ContractA.address, %s", cErc20ContractA.address);
    console.log("cErc20ContractB.address, %s", cErc20ContractB.address);
  });

  describe("Create otherAccout for mint/reedem test case", function () {
    it("Create otherAccout for mint/reedem test case", async function(){
      // CErc20 initialize
      await cErc20ContractA["initialize(address,address,address,uint256,string,string,uint8)"](
        erc20ContractA.address,
        comptrollerContract.address,
        interestRateModelContract.address,
        ethers.utils.parseUnits("1", 18),
        "cErc20A",
        "cTokenA",
        18
      );

      // if want to mint by other account, need to add cToken to market first
      // if mssing this step, will popup "reverted with custom error 'MintComptrollerRejection(9)'" error message
      await comptrollerContract.connect(owner)._supportMarket(cErc20ContractA.address);

      // And find in Erc20, need to approve token allowance
      // if missing this step, will popup "ERC20: insufficient allowance" error message
      await erc20ContractA.connect(otherAccount).approve(cErc20ContractA.address, ethers.utils.parseUnits("100", 18));

      // And if want to mint, the user also need have enough balance
      // if missing this step, will popup "ERC20: transfer amount exceeds balance" error message
      await erc20ContractA.connect(owner).transfer(otherAccount.address, ethers.utils.parseUnits("100", 18));

      // verify otherAccount already have erc20 * 100 tokens
      expect(await erc20ContractA.balanceOf(otherAccount.address)).to.equal(ethers.utils.parseUnits("100", 18));

      // verify otherAccount after mint, then will have cErc20 * 100 tokens
      await cErc20ContractA.connect(otherAccount).mint(ethers.utils.parseUnits("100", 18));
      expect(await cErc20ContractA.balanceOf(otherAccount.address)).to.equal(ethers.utils.parseUnits("100", 18));

      // verify otherAccount after redeem, then will have cErc20 * 0 tokens and Erc20 * 100 tokens
      await cErc20ContractA.connect(otherAccount).redeem(ethers.utils.parseUnits("100", 18));
      expect(await cErc20ContractA.balanceOf(otherAccount.address)).to.equal(ethers.utils.parseUnits("0", 18));
      expect(await erc20ContractA.balanceOf(otherAccount.address)).to.equal(ethers.utils.parseUnits("100", 18));
    });
  });

  describe("Test borrow and repay", function () {
    it("Test borrow and repay", async function(){
      // CErc20 initialize
      await cErc20ContractB["initialize(address,address,address,uint256,string,string,uint8)"](
        erc20ContractB.address,
        comptrollerContract.address,
        interestRateModelContract.address,
        ethers.utils.parseUnits("1", 18),
        "cErc20B",
        "cTokenB",
        18
      );

      // Set simplePriceOracle
      await comptrollerContract._setPriceOracle(simplePriceOracleContract.address);

      // Add cErc20B token into the market
      await comptrollerContract.connect(owner)._supportMarket(cErc20ContractB.address);

      // set cErc20A as $1
      await simplePriceOracleContract.setUnderlyingPrice(cErc20ContractA.address, ethers.utils.parseUnits("1", 18));

      // set cErc20B as $100
      await simplePriceOracleContract.setUnderlyingPrice(cErc20ContractB.address, ethers.utils.parseUnits("100", 18));

      // set cErc20B's collateral factor to 0.5
      await comptrollerContract.connect(owner)._setCollateralFactor(cErc20ContractB.address, ethers.utils.parseUnits("0.5", 18));

      // let cErc20B enter the Market
      await comptrollerContract.enterMarkets([cErc20ContractB.address]);

      // Transfer 1 * erc20B to otherAccount
      await erc20ContractB.connect(owner).transfer(otherAccount.address, ethers.utils.parseUnits("1", 18));
      expect(await erc20ContractB.balanceOf(otherAccount.address)).to.equal(ethers.utils.parseUnits("1", 18));

      // otherAaccount mint 1 * cErc20B
      await erc20ContractB.connect(otherAccount).approve(cErc20ContractB.address, ethers.utils.parseUnits("1", 18));
      await cErc20ContractB.connect(otherAccount).mint(ethers.utils.parseUnits("1", 18));
      expect(await cErc20ContractB.balanceOf(otherAccount.address)).to.equal(ethers.utils.parseUnits("1", 18));

      // Transfer 100 * erc20A to otherAccount2
      await erc20ContractA.transfer(otherAccount2.address, ethers.utils.parseUnits("100", 18));
      expect(await erc20ContractA.balanceOf(otherAccount2.address)).to.equal(ethers.utils.parseUnits("100", 18));

      // otherAccount2 mint 100 * cErc20A
      await erc20ContractA.connect(otherAccount2).approve(cErc20ContractA.address, ethers.utils.parseUnits("100", 18));
      await cErc20ContractA.connect(otherAccount2).mint(ethers.utils.parseUnits("100", 18));
      expect(await cErc20ContractA.balanceOf(otherAccount2.address)).to.equal(ethers.utils.parseUnits("100", 18));

      // Stuck on "reverted with custom error 'BorrowComptrollerRejection(4)'"
      // Have no idea for fix this issue now...
      await cErc20ContractA.connect(otherAccount).borrow(ethers.utils.parseUnits("50", 18));
    });
  });
});
