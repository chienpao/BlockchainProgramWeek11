const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const hre = require("hardhat");
const ethers = hre.ethers

describe("The CErc20 Full testing start...", function () {

  async function deployNeededContract(){
    const {erc20Deploy} = await loadFixture(deployErc20);
    const {comptrollerDeploy} = await loadFixture(deployComptroller)
    const {interestRateModelDeploy} = await loadFixture(deployInterestRateModel)
    const {cErc20Deploy} = await loadFixture(deploycErc20)
    return {erc20Deploy, comptrollerDeploy, interestRateModelDeploy, cErc20Deploy}
  }

  async function deployErc20() {
    const erc20Factory = await ethers.getContractFactory("TestErc20");
    const erc20Deploy = await erc20Factory.deploy("My Token", "mtoken", ethers.utils.parseUnits("100", 18));
    await erc20Deploy.deployed();
    return { erc20Deploy };
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

  async function deploycErc20() {
    const cErc20Factory = await ethers.getContractFactory("CErc20");
    const cErc20Deploy = await cErc20Factory.deploy();
    await cErc20Deploy.deployed();
    return { cErc20Deploy };
  }

  let erc20Contract, comptrollerContract, interestRateModelContract, cErc20Contract;
  let owner, otherAccount;

  before(async function () {
    console.log("top before");
    const {erc20Deploy, comptrollerDeploy, interestRateModelDeploy, cErc20Deploy} = await deployNeededContract();
    erc20Contract = erc20Deploy;
    comptrollerContract = comptrollerDeploy;
    interestRateModelContract = interestRateModelDeploy;
    cErc20Contract = cErc20Deploy;
  });

  beforeEach(async function () {
    console.log("top beforeEach");
    const [ownerEther, otherAccountEther] = await ethers.getSigners();
    owner = ownerEther;
    otherAccount = otherAccountEther;
  });


  it("Create otherAccout for mint/reedem test case", async function(){
    // CErc20 initialize
    await cErc20Contract["initialize(address,address,address,uint256,string,string,uint8)"](
      erc20Contract.address,
      comptrollerContract.address,
      interestRateModelContract.address,
      ethers.utils.parseUnits("1", 18),
      "Compound test token",
      "cToken",
      18
    );

    // Create other account prepare for testing
    // const [owner, otherAccount] = await ethers.getSigners();
    // console.log(otherAccount.address);

    // if want to mint by other account, need to add cToken to market first
    // if mssing this step, will popup "reverted with custom error 'MintComptrollerRejection(9)'" error message
    await comptrollerContract.connect(owner)._supportMarket(cErc20Contract.address);

    // And find in Erc20, need to approve token allowance
    // if missing this step, will popup "ERC20: insufficient allowance" error message
    await erc20Contract.connect(otherAccount).approve(cErc20Contract.address, ethers.utils.parseUnits("100", 18));

    // And if want to mint, the user also need have enough balance
    // if missing this step, will popup "ERC20: transfer amount exceeds balance" error message
    await erc20Contract.connect(owner).transfer(otherAccount.address, ethers.utils.parseUnits("100", 18));

    // verify otherAccount already have erc20 * 100 tokens
    expect(await erc20Contract.balanceOf(otherAccount.address)).to.equal(ethers.utils.parseUnits("100", 18));

    // verify otherAccount after mint, then will have cErc20 * 100 tokens
    await cErc20Contract.connect(otherAccount).mint(ethers.utils.parseUnits("100", 18));
    expect(await cErc20Contract.balanceOf(otherAccount.address)).to.equal(ethers.utils.parseUnits("100", 18));

    // verify otherAccount after redeem, then will have cErc20 * 0 tokens and Erc20 * 100 tokens
    await cErc20Contract.connect(otherAccount).redeem(ethers.utils.parseUnits("100", 18));
    expect(await cErc20Contract.balanceOf(otherAccount.address)).to.equal(ethers.utils.parseUnits("0", 18));
    expect(await erc20Contract.balanceOf(otherAccount.address)).to.equal(ethers.utils.parseUnits("100", 18));

  });
});
