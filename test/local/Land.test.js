const { assert } = require('./setup');
const {
  tokenName,
  tokenSymbol,
  tokenMaxSupply,
  tokenContractURI,
  tokenURI,
  mainnetProxyRegistryAddress,
} = require('../../config');

describe('Land', function () {
  describe('State', function () {
    it('should have a valid token name', async function () {
      return assert.equal(await this.land.name(), tokenName);
    });

    it('should have a valid token symbol', async function () {
      return assert.equal(await this.land.symbol(), tokenSymbol);
    });

    it('should have a valid token maximum supply', async function () {
      return assert.equal(await this.land.maximumSupply(), tokenMaxSupply);
    });

    it('should have the correct contract-level URI', async function () {
      return assert.equal(await this.land.contractURI(), tokenContractURI);
    });

    it('should have the correct token URI', async function () {
      return assert.equal(await this.land.tokenURI(0), tokenURI);
    });
    
    it('should have the correct OpenSea proxy contract linked', async function () {
      // Local development use the same address as the mainnet one as placeholder
      return assert.equal((await this.land.proxyRegistryAddress.call()).toLowerCase(), mainnetProxyRegistryAddress);
    });

    it('should have the correct sale logic contract linked', async function () {
      return assert.equal(await this.land.logicContractAddress(), this.sale.address);
    });
  });

  describe('Methods ✅', function () {
    it('should allow owner to set the contract URI', async function () {
      const newContractURI = 'ipfs://contract';
      await this.land.setContractURI(newContractURI);
      return assert.equal(await this.land.contractURI(), newContractURI);
    });

    it('should allow owner to set the token URI', async function () {
      const newTokenURI = 'ipfs://token';
      await this.land.setTokenURI(newTokenURI);
      return assert.equal(await this.land.tokenURI(0), newTokenURI);
    });
  });

  describe('Methods 🛑', function () {
    it('should not allow non-owner to set the contract URI', function () {
      const newContractURI = 'ipfs://contract';
      return assert.isRejected(
        this.land.setContractURI(newContractURI, { from: this.secondarySender })
      );
    });

    it('should not allow non-owner to set the token URI', function () {
      const newTokenURI = 'ipfs://token';
      return assert.isRejected(
        this.land.setTokenURI(newTokenURI, { from: this.secondarySender })
      );
    });
  });
});
