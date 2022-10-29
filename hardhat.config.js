require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  networks: {
    hardhat: {
      forking: {
        url: "https://eth-mainnet.g.alchemy.com/v2/HKy02aWoSV2uZfUpBFgFHOBZXc6E1Q1I",
        blockNumber: 14390000,
        enabled: true
      }
    }
  },
  allowUnlimitedContractSize: true
};
