const ganacheCore = require('ganache-core');
const { localMnemonic } = require('./config');

const port = 8545;
const host = 'localhost';
const callback = () => null;

const ganacheServer = ganacheCore.server({
  network_id: 3333,
  total_accounts: 7,
  gasLimit: 20000000,
  gasPrice: 100000000000,
  default_balance_ether: 200000000,
  mnemonic: localMnemonic,
});

ganacheServer.listen(port, host, callback);
