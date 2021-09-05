const {
  tokenName,
  tokenSymbol,
  tokenMaxSupply,
  tokenContractURI,
  tokenURI,
  rinkebyProxyRegistryAddress,
  mainnetProxyRegistryAddress,
} = require('../config');
const LandSale = artifacts.require('./LandSale.sol');
const Land = artifacts.require('./Land.sol');

module.exports = async (deployer, network) => {
  // Use the correct OpenSea proxy registry address based on the network used for deployment
  let proxyRegistryAddress = '';
  if (network === 'rinkeby') {
    proxyRegistryAddress = rinkebyProxyRegistryAddress;
  } else {
    proxyRegistryAddress = mainnetProxyRegistryAddress;
  }

  await deployer.deploy(LandSale);
  await deployer.deploy(Land, tokenName, tokenSymbol, tokenMaxSupply, tokenContractURI, tokenURI, proxyRegistryAddress);
};
