const assert = require('assert');
const assertRevert = require('./utils/assertRevert');
const { ethers } = require('hardhat');

describe('State Changes', () => {
  let Ethernauts;

  let users;
  let owner, user;

  before('identify signers', async () => {
    users = await ethers.getSigners();
    [owner, user] = users;
  });

  before('deploy contract', async () => {
    const factory = await ethers.getContractFactory('Ethernauts');

    const params = { ...hre.config.defaults };
    params.definitiveMaxGiftable = 10;
    params.definitiveMaxTokens = 100;

    Ethernauts = await factory.deploy(...Object.values(params));
  });

  it('contract starts in state paused', async () => {
    assert.equal(await Ethernauts.currentSaleState(), 0);
  });

  it('owner can freely change from one state to another (not complete)', async () => {
    await (await Ethernauts.connect(owner).setSaleState(1)).wait();
    assert.equal(await Ethernauts.currentSaleState(), 1);

    await (await Ethernauts.connect(owner).setSaleState(2)).wait();
    assert.equal(await Ethernauts.currentSaleState(), 2);

    await (await Ethernauts.connect(owner).setSaleState(1)).wait();
    assert.equal(await Ethernauts.currentSaleState(), 1);

    await (await Ethernauts.connect(owner).setSaleState(0)).wait();
    assert.equal(await Ethernauts.currentSaleState(), 0);
  });

  it('owner cannot switch to sale complete', async () => {
    await assertRevert(Ethernauts.connect(owner).setSaleState(3), 'SaleStateError(3, 3)');
    assert.equal(await Ethernauts.currentSaleState(), 0);
  });

  it('state cannot be overriden with the same value', async () => {
    await assertRevert(Ethernauts.connect(owner).setSaleState(0), 'SaleStateError(0, 0)');
    assert.equal(await Ethernauts.currentSaleState(), 0);
  });

  it('state cannot be changed after public sale is completed', async () => {
    await (await Ethernauts.connect(owner).setSaleState(2)).wait();
    const num =
      (await Ethernauts.maxTokens()).toNumber() -
      (await Ethernauts.maxGiftable()).toNumber() -
      (await Ethernauts.totalSupply()).toNumber();

    let promises = [];
    for (let i = 0; i < num; i++) {
      promises.push(
        (
          await Ethernauts.connect(user).mint({
            value: ethers.utils.parseEther('0.2'),
          })
        ).wait()
      );
    }
    await Promise.all(promises);
    assert.equal(await Ethernauts.currentSaleState(), 3);

    await assertRevert(Ethernauts.connect(owner).setSaleState(2), 'CurrentStateError(3, 3)');
  });
});
