const Promise = require('bluebird');
const { assert } = require('./setup');
const { default: BigNumber } = require('bignumber.js');
const moment = require('moment');

describe('LandSale', function () {
  describe('State', function () {
    it('should have the correct token contract linked', async function () {
      return assert.equal(await this.sale.tokenContract(), this.land.address);
    });
  });

  describe('Methods ✅', function () {
    it('should allow owner to set funds addresses', async function () {
      // Treasury should get 5%, while each founder account should get 23.75%
      await this.sale.setFundsAddress(0, this.treasuryAccount);
      await this.sale.setFundsAddress(1, this.founderAccount);
      assert.equal((await this.sale.fundsAddresses(0)).toLowerCase(), this.treasuryAccount);

      return assert.equal((await this.sale.fundsAddresses(1)).toLowerCase(), this.founderAccount);
    });

    it('should allow owner to set the funds unlock time', async function () {
      const unlockTimestamp = moment().add(31, 'days').unix();

      await this.sale.setFundsUnlockTimestamp(unlockTimestamp);

      return assert.equal(new BigNumber(await this.sale.fundsUnlockTimestamp.call()).toFixed(0), unlockTimestamp);
    });

    it('should allow owner to whitelist an address and set its allowance', async function () {
      const tokenPrice = new BigNumber('1e18');
      const tokenCount = 2;
      await this.sale.setAllowance(this.primarySender, tokenCount, tokenPrice);
      const allowance = await this.sale.allowance(this.primarySender);
      assert.equal(new BigNumber(allowance.count).toFixed(0), tokenCount);

      return assert.equal(new BigNumber(allowance.price).toFixed(0), tokenPrice);
    });

    it('should allow owner to whitelist list of addresses and set the allowances', async function () {
      const addresses = [this.accounts[4], this.accounts[5], this.accounts[6]];
      const tokenPrices = [new BigNumber('1e18'), new BigNumber('2e18'), new BigNumber('1e18')];
      const tokenCounts = [1, 5, 1];
      await this.sale.batchSetAllowances(addresses, tokenCounts, tokenPrices);

      const allowance1 = await this.sale.allowance(this.accounts[4]);
      const allowance2 = await this.sale.allowance(this.accounts[5]);
      const allowance3 = await this.sale.allowance(this.accounts[6]);
      assert.equal(new BigNumber(allowance1.count).toFixed(0), tokenCounts[0]);
      assert.equal(new BigNumber(allowance2.count).toFixed(0), tokenCounts[1]);
      assert.equal(new BigNumber(allowance3.count).toFixed(0), tokenCounts[2]);

      assert.equal(new BigNumber(allowance1.price).toFixed(0), tokenPrices[0]);
      assert.equal(new BigNumber(allowance2.price).toFixed(0), tokenPrices[1]);
      return assert.equal(new BigNumber(allowance3.price).toFixed(0), tokenPrices[2]);
    });

    it('should allow users with sufficient funds to purchase a token', async function () {
      const previousTotalSupply = new BigNumber(await this.land.totalSupply());

      // Store current balance of the sale address for later comparisons
      const saleBalance = new BigNumber(await this.web3.eth.getBalance(this.sale.address));
      const allowance = await this.sale.allowance(this.primarySender);
      const tokenPrice = new BigNumber(allowance.price).multipliedBy(allowance.count);
      const currentTotalSupply = previousTotalSupply.plus(allowance.count);

      await this.web3.eth.sendTransaction({
        from: this.primarySender,
        to: this.sale.address,
        value: tokenPrice.toFixed(0),
      });

      // Confirm the minted token's index and owner
      const lastTokenOwner = await this.land.ownerOf(currentTotalSupply.toFixed(0));
      assert.equal(lastTokenOwner.toLowerCase(), this.primarySender);

      // Confirm the transferred funds to the sale address
      const updatedSaleBalance = await this.web3.eth.getBalance(this.sale.address);
      assert.equal(new BigNumber(updatedSaleBalance).toFixed(0), saleBalance.plus(tokenPrice).toFixed(0));

      // Confirm the amount of owed funds to the fund addresses
      assert.equal(new BigNumber(await this.sale.reserveFunds.call()).toFixed(0), tokenPrice.multipliedBy(0.05).toFixed(0));
      assert.equal(new BigNumber(await this.sale.unlockedFunds.call()).toFixed(0), tokenPrice.multipliedBy(0.95 / 2).toFixed(0));
      assert.equal(new BigNumber(await this.sale.lockedFunds.call()).toFixed(0), tokenPrice.multipliedBy(0.95 / 2).toFixed(0));

      // Confirm the updated allowance
      const newAllowance = await this.sale.allowance(this.primarySender);
      assert.equal(new BigNumber(newAllowance.count).toFixed(0), 0);

      // Confirm the latest token supply
      return assert.equal(new BigNumber(await this.land.totalSupply()).toFixed(0), currentTotalSupply.toFixed(0));
    });

    it('should allow funds addresses to withdraw any unlocked owed funds', async function () {
      const treasuryBalance = new BigNumber(await this.web3.eth.getBalance(this.treasuryAccount));
      const founderBalance = new BigNumber(await this.web3.eth.getBalance(this.founderAccount));
      const reserveFunds = new BigNumber(await this.sale.reserveFunds.call());
      const unlockedFunds = new BigNumber(await this.sale.unlockedFunds.call());

      // Perform withdrawal, then get the new balances and compare it with the old balance
      await this.sale.withdraw();
      const updatedTreasuryBalance = new BigNumber(await this.web3.eth.getBalance(this.treasuryAccount));
      const updatedFounderBalance = new BigNumber(await this.web3.eth.getBalance(this.founderAccount));

      assert.equal(new BigNumber(await this.sale.reserveFunds.call()).toFixed(0), 0);
      assert.equal(new BigNumber(await this.sale.unlockedFunds.call()).toFixed(0), 0);
      assert.equal(updatedTreasuryBalance.toFixed(0), treasuryBalance.plus(reserveFunds).toFixed(0));

      return assert.equal(updatedFounderBalance.toFixed(0), founderBalance.plus(unlockedFunds.dividedToIntegerBy(4)).toFixed(0));
    });

    it('should allow users to request a refund and burn the last minted token', async function () {
      const allowance = await this.sale.allowance(this.primarySender);
      const refundAmount = new BigNumber(allowance.price).dividedToIntegerBy(2);
      const saleBalance = new BigNumber(await this.web3.eth.getBalance(this.sale.address));
      const userBalance = new BigNumber(await this.web3.eth.getBalance(this.primarySender));
      const lockedFunds = new BigNumber(await this.sale.lockedFunds.call());
      const previousTotalSupply = new BigNumber(await this.land.totalSupply());
      const currentTotalSupply = previousTotalSupply.minus(1);

      // Refund and get the new balances to compare it with the old balances
      const { receipt: { cumulativeGasUsed } } = await this.sale.refund({ from: this.primarySender });
      const gasCost = new BigNumber(cumulativeGasUsed).multipliedBy(new BigNumber('1e11')); // To wei
      const updatedSaleBalance = new BigNumber(await this.web3.eth.getBalance(this.sale.address));
      const updatedUserBalance = new BigNumber(await this.web3.eth.getBalance(this.primarySender));
      const updatedLockedFunds = new BigNumber(await this.sale.lockedFunds.call());

      assert.equal(updatedLockedFunds.toFixed(0), lockedFunds.minus(refundAmount).toFixed(0));
      assert.equal(updatedSaleBalance.toFixed(0), saleBalance.minus(refundAmount).toFixed(0));
      assert.equal(updatedUserBalance.toFixed(0), userBalance.plus(refundAmount).minus(gasCost).toFixed(0));

      // Confirm that the total supply is also updated
      return assert.equal(new BigNumber(await this.land.totalSupply()).toFixed(0), currentTotalSupply.toFixed(0));
    });
  });

  describe('Methods 🛑', function () {
    it('should not allow non-owner to set fund addresses', function () {
      return assert.isRejected(
        this.sale.setFundsAddress(0, this.treasuryAccount, { from: this.secondarySender })
      );
    });

    it('should not allow non-owner to set the funds unlock time', function () {
      const unlockTimestamp = moment().add(1, 'days').unix();

      return assert.isRejected(
        this.sale.setFundsUnlockTimestamp(unlockTimestamp, { from: this.secondarySender })
      );
    });

    it('should not allow non-owner to whitelist an address and set its allowance', function () {
      return assert.isRejected(
        this.sale.setAllowance(this.primarySender, 1, new BigNumber(0), { from: this.secondarySender })
      );
    });

    it('should not allow non-owner to whitelist list of addresses and set the allowances', async function () {
      const addresses = [this.accounts[4], this.accounts[5], this.accounts[6]];
      const tokenPrices = [new BigNumber('1e18'), new BigNumber('2e18'), new BigNumber('1e18')];
      const tokenCounts = [1, 5, 1];
      return assert.isRejected(
        this.sale.batchSetAllowances(addresses, tokenCounts, tokenPrices, { from: this.secondarySender })
      );
    });

    it('should not allow users with insufficient funds to purchase a token', function () {
      return assert.isRejected(
        this.web3.eth.sendTransaction({
          from: this.primarySender,
          to: this.sale.address,
          value: new BigNumber('1e15').toFixed(0),
        })
      );
    });

    it('should not allow users with non-whitelisted accounts to purchase a token', function () {
      return assert.isRejected(
        this.web3.eth.sendTransaction({
          from: this.secondarySender,
          to: this.sale.address,
          value: new BigNumber('1e18').toFixed(0),
        })
      );
    });

    it('should not allow non-funds addresses to withdraw', function () {
      return assert.isRejected(
        this.sale.withdraw({ from: this.secondarySender })
      );
    });

    it('should not allow fund addresses to withdraw for 0 amount owed', function () {
      return assert.isRejected(
        this.sale.withdraw({ from: this.treasuryAccount })
      );
    });
  });
});
