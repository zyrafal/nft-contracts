const Web3 = require('web3');
const HDWalletProvider = require('@truffle/hdwallet-provider');
const { assert } = require('chai').use(require('chai-as-promised'));
const { forEach } = require('lodash');
const { setUpGlobalTestVariables } = require('../util');
const {
  localProvider,
  localMnemonic,
} = require('../../config');

before(async function () {
  const provider = new HDWalletProvider(localMnemonic, localProvider);
  this.web3 = new Web3(provider);
  this.accounts = this.web3.eth.accounts.currentProvider.addresses;
  this.primarySender = this.accounts[0];
  this.secondarySender = this.accounts[1];
  this.treasuryAccount = this.accounts[2];
  this.founderAccount = this.accounts[3];

  // Add variables to test execution context
  forEach(await setUpGlobalTestVariables(localProvider, this.primarySender), (value, key) => {
    this[key] = value;
  });
});

module.exports = {
  assert,
};
