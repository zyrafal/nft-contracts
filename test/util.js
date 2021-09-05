const contract = require('@truffle/contract');

const contractBuildFiles = [
  require('../build/contracts/LandSale.json'),
  require('../build/contracts/Land.json'),
];

const getTruffleContracts = (rpcAPI, primaryAccount) =>
  contractBuildFiles.reduce((contracts, { contractName, abi, networks }) => {
    const truffleContract = contract({ contractName, abi, networks });

    truffleContract.setProvider(rpcAPI);

    truffleContract.defaults({
      from: primaryAccount,
      gas: 10000000,
      gasPrice: 100000000000
    });

    return {
      ...contracts,
      [contractName]: truffleContract
    };
  }, {});

const setUpGlobalTestVariables = async (rpcAPI, primaryAccount) => {
  const contracts = getTruffleContracts(rpcAPI, primaryAccount);

  return {
    contracts,
    sale: await contracts.LandSale.deployed(),
    land: await contracts.Land.deployed(),
  };
};

module.exports = {
  getTruffleContracts,
  setUpGlobalTestVariables,
};
