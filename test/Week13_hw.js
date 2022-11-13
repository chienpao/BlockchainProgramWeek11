
const { loadFixture, impersonateAccount } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

/*
Fork Ethereum mainnet at block 15815693 (Reference)
cToken 的 decimals 皆為 18，初始 exchangeRate 為 1:1
使用 USDC 以及 UNI 代幣來作為 token A 以及 Token B
在 Oracle 中設定 USDC 的價格為 $1，UNI 的價格為 $10
設定 UNI 的 collateral factor 為 50%
User1 使用 1000 顆 UNI 作為抵押品借出 5000 顆 USDC
將 UNI 價格改為 $6.2 使 User1 產生 Shortfall，並讓 User2 透過 AAVE 的 Flash loan 來清算 User1
*/

const DECIMALS = 18;
const UNI_DECIMALS = 6;

const USDC_ADDREESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
const UNI_ADDRESS = "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984"

const BINANCE_WALLET_ADDRESS = "0xF977814e90dA44bFA03b6295A0616a897441aceC"
const AAVE_LENDING_POOL_ADDRESS_PROVIDER = '0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5';
const UNISWAP_ROUTER_ADDRESS = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

const COLLATERAL_FACTOR = ethers.utils.parseUnits("0.5", DECIMALS);
const CLOSE_FACTOR = ethers.utils.parseUnits("0.5", DECIMALS);
const USDC_AMOUNT = ethers.utils.parseUnits("5000", UNI_DECIMALS);
const UNI_AMOUNT = ethers.utils.parseUnits("1000", DECIMALS);

describe("The Flash Loan Full testing start...", function () {
  async function deployContracts() {
    const comptrollerFactory = await ethers.getContractFactory("Comptroller");
    const comptrollerDeploy = await comptrollerFactory.deploy();
    await comptrollerDeploy.deployed();

    const interestRateModelFactory = await ethers.getContractFactory("WhitePaperInterestRateModel");
    const interestRateModelDeploy = await interestRateModelFactory.deploy(ethers.utils.parseUnits("0", DECIMALS), ethers.utils.parseUnits("0", DECIMALS));
    await interestRateModelDeploy.deployed();

    const simeplePriceOracleFactory = await ethers.getContractFactory("SimplePriceOracle");
    const simplePriceOracleDeploy = await simeplePriceOracleFactory.deploy();
    await simplePriceOracleDeploy.deployed();

    const usdcDeploy = await ethers.getContractAt("TestErc20", USDC_ADDREESS);
    const uniDeploy = await ethers.getContractAt("TestErc20", UNI_ADDRESS);

    const cErc20Factory = await ethers.getContractFactory("CErc20");
    const cUsdcDeploy = await cErc20Factory.deploy();
    await cUsdcDeploy.deployed();

    const cErc20Factory2 = await ethers.getContractFactory("CErc20");
    const cUniDeploy = await cErc20Factory2.deploy();
    await cUniDeploy.deployed();

    await cUsdcDeploy["initialize(address,address,address,uint256,string,string,uint8)"](
      usdcDeploy.address,
      comptrollerDeploy.address,
      interestRateModelDeploy.address,
      ethers.utils.parseUnits("1", UNI_DECIMALS),
      "cUsdc",
      "cUsdc",
      DECIMALS,
    );

    await cUniDeploy["initialize(address,address,address,uint256,string,string,uint8)"](
      uniDeploy.address,
      comptrollerDeploy.address,
      interestRateModelDeploy.address,
      ethers.utils.parseUnits("1", DECIMALS),
      "cUni",
      "cUni",
      DECIMALS,
    );

    const flashLoanFactory = await ethers.getContractFactory("AaveFlashLoan");
    const flashLoanDeploy = await flashLoanFactory.deploy(
      AAVE_LENDING_POOL_ADDRESS_PROVIDER,
      UNISWAP_ROUTER_ADDRESS
    );
    await flashLoanDeploy.deployed()

    return {
      comptrollerDeploy, interestRateModelDeploy, simplePriceOracleDeploy, flashLoanDeploy,
      usdcDeploy, uniDeploy,
      cUsdcDeploy, cUniDeploy
    };
  }

  let comptroller, interestRateModel, simplePriceOracle, flashLoan;
  let usdc, uni;
  let cUsdc, cUni;
  let owner, user1

  async function initializeContracts() {
    const { comptrollerDeploy, interestRateModelDeploy, simplePriceOracleDeploy, flashLoanDeploy,
      usdcDeploy, uniDeploy,
      cUsdcDeploy, cUniDeploy
    } = await loadFixture(deployContracts);

    return {
      comptrollerDeploy, interestRateModelDeploy, simplePriceOracleDeploy, flashLoanDeploy,
      usdcDeploy, uniDeploy,
      cUsdcDeploy, cUniDeploy
    }
  }

  before(async function () {

    // Initialize contracts
    const { comptrollerDeploy, interestRateModelDeploy, simplePriceOracleDeploy, flashLoanDeploy,
      usdcDeploy, uniDeploy,
      cUsdcDeploy, cUniDeploy } = await initializeContracts();

    comptroller = comptrollerDeploy;
    interestRateModel = interestRateModelDeploy;
    simplePriceOracle = simplePriceOracleDeploy;
    flashLoan = flashLoanDeploy;
    usdc = usdcDeploy;
    uni = uniDeploy;
    cUsdc = cUsdcDeploy;
    cUni = cUniDeploy;

    const [ownerEther, user1Ether] = await ethers.getSigners();
    owner = ownerEther;
    user1 = user1Ether;
  });

  describe("Start testing...", function () {
    it("After initialze, setup pre-settings...", async function () {
      // set cUsdc and cUni price
      await simplePriceOracle.setUnderlyingPrice(cUsdc.address, BigInt(1 * 1e18) * BigInt(1e12))
      await simplePriceOracle.setUnderlyingPrice(cUni.address, ethers.utils.parseUnits("10", DECIMALS));

      // set simple price orable
      await comptroller._setPriceOracle(simplePriceOracle.address);

      // add cUsdc and cUni into support market
      await comptroller._supportMarket(cUsdc.address);
      await comptroller._supportMarket(cUni.address);

      // set cUni enter markes can be collateral
      await comptroller.enterMarkets([cUni.address]);

      // set cUni's collateral factor to 50%
      await comptroller._setCollateralFactor(cUni.address, COLLATERAL_FACTOR);

      // set close factor to 50%
      await comptroller._setCloseFactor(CLOSE_FACTOR);

      // set LiquidationIncentive to 10%
      await comptroller._setLiquidationIncentive(ethers.utils.parseUnits("1.1", DECIMALS));
    });

    it("Get Uni token from Binance to owner...", async function () {
      await impersonateAccount(BINANCE_WALLET_ADDRESS);
      const binance = await ethers.getSigner(BINANCE_WALLET_ADDRESS);

      await uni.connect(binance).transfer(owner.address, UNI_AMOUNT);

      // check Uni balance
      const uniBalance = await uni.balanceOf(owner.address);
      console.log("owner's uniBalance %s", uniBalance);
      expect(uniBalance).to.eq(UNI_AMOUNT);
    });

    it("Get Usdc token from Binance to user1...", async function () {
      await impersonateAccount(BINANCE_WALLET_ADDRESS);
      const binance = await ethers.getSigner(BINANCE_WALLET_ADDRESS);

      await usdc.connect(binance).transfer(user1.address, USDC_AMOUNT);

      // check Usdc balance
      const usdcBalance = await usdc.balanceOf(user1.address)
      console.log("user1's usdcBalance %s", usdcBalance);
      expect(usdcBalance).to.eq(USDC_AMOUNT);
    });

    it("Flash Loan liquidate...", async function () {
      // supply user1 5000 cUsdc
      await usdc.connect(user1).approve(cUsdc.address, USDC_AMOUNT);
      await cUsdc.connect(user1).mint(USDC_AMOUNT);

      // supply owner 1000 cUni
      await uni.approve(cUni.address, UNI_AMOUNT);
      await cUni.mint(UNI_AMOUNT);

      // owner borrow 5000 USDC
      await cUsdc.borrow(USDC_AMOUNT);

      // set Uni's price to $6.2
      await simplePriceOracle.setUnderlyingPrice(cUni.address, ethers.utils.parseUnits("6.2", DECIMALS));

      // check shortfall
      const results = await comptroller.getAccountLiquidity(owner.address);
      let shortfall = results[2];
      console.log("owner shortfall: %s", shortfall)
      expect(shortfall).to.eq(ethers.utils.parseUnits("1900", DECIMALS));

      const borrowBalance = await cUsdc.callStatic.borrowBalanceCurrent(owner.address);
      console.log("borrowBalance: %s", borrowBalance);

      const repayAmount = borrowBalance * CLOSE_FACTOR / ethers.utils.parseUnits("1", DECIMALS);
      console.log("repayAmount: %s", repayAmount);

      // use Aave FlashLoan
      await flashLoan.connect(user1).flashLoan([usdc.address], [repayAmount], [0], owner.address,
        cUsdc.address, cUni.address, uni.address
      );

      const bonus = await usdc.balanceOf(flashLoan.address)
      
      // check liquidate bonus greater to zero
      expect(bonus).to.gt(0);
    });

  });
})