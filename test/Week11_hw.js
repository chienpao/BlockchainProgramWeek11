// const {
//   impersonateAccount
// } = require("@nomicfoundation/hardhat-network-helpers");
// const {time,loadFixture,impersonateAccount} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const hre = require("hardhat");
const ethers = hre.ethers

// before
// afterEach

describe("The Full testing start...", function () {

  it("Deploy CERC20 contract", async function(){

    const erc20Factory = await ethers.getContractFactory("TestErc20");
    const erc20Deploy = await erc20Factory.deploy("My Token", "mtoken", 10000);
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

    // await cErc20Deploy.initialize(
    await cErc20Deploy["initialize(address,address,address,uint256,string,string,uint8)"](
      erc20Deploy.address,
      comptrollerDeploy.address,
      interestRateModelDeploy.address,
      ethers.utils.parseUnits("1", 18),
      "Compound test token",
      "cMytoken",
      18
    );
  });
});
