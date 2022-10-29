const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const hre = require("hardhat");
const ethers = hre.ethers

// before
// afterEach

describe("The CErc20 Full testing start...", function () {

  it("Create otherAccout for mint/reedem test case", async function(){

    const erc20Factory = await ethers.getContractFactory("TestErc20");
    const erc20Deploy = await erc20Factory.deploy("My Token", "mtoken", ethers.utils.parseUnits("100", 18));
    await erc20Deploy.deployed();
    // console.log(erc20.address)

    const comptrollerFactory = await ethers.getContractFactory("Comptroller");
    const comptrollerDeploy = await comptrollerFactory.deploy();
    await comptrollerDeploy.deployed();
    // console.log(comptrollerDeploy.address);

    const interestRateModelFactory = await ethers.getContractFactory("WhitePaperInterestRateModel");
    const interestRateModelDeploy = await interestRateModelFactory.deploy(ethers.utils.parseUnits("0", 18), ethers.utils.parseUnits("0", 18));
    await interestRateModelDeploy.deployed();
    // console.log(interestRateModelDeploy.address);

    const cErc20Factory = await ethers.getContractFactory("CErc20");
    const cErc20Deploy = await cErc20Factory.deploy();
    await cErc20Deploy.deployed();

    await cErc20Deploy["initialize(address,address,address,uint256,string,string,uint8)"](
      erc20Deploy.address,
      comptrollerDeploy.address,
      interestRateModelDeploy.address,
      ethers.utils.parseUnits("1", 18),
      "Compound test token",
      "cToken",
      18
    );

    // Create other account prepare for testing
    const [owner, otherAccount] = await ethers.getSigners();
    // console.log(otherAccount.address);

    // if want to mint by other account, need to add cToken to market first
    // if mssing this step, will popup "reverted with custom error 'MintComptrollerRejection(9)'" error message
    await comptrollerDeploy.connect(owner)._supportMarket(cErc20Deploy.address);

    // And find in Erc20, need to approve token allowance
    // if missing this step, will popup "ERC20: insufficient allowance" error message
    await erc20Deploy.connect(otherAccount).approve(cErc20Deploy.address, ethers.utils.parseUnits("100", 18));

    // And if want to mint, the user also need have enough balance
    // if missing this step, will popup "ERC20: transfer amount exceeds balance" error message
    await erc20Deploy.connect(owner).transfer(otherAccount.address, ethers.utils.parseUnits("100", 18));

    // And finally, mint successfully!
    await cErc20Deploy.connect(otherAccount).mint(ethers.utils.parseUnits("100", 18));

    // And finally, redeem successfully!
    await cErc20Deploy.connect(otherAccount).redeem(ethers.utils.parseUnits("100", 18));
  });
});
