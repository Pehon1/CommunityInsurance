const {expect, use} = require('chai');
const {Contract} = require('ethers');

const {deployContract, MockProvider, solidity} = require('ethereum-waffle')
const testContract = require('../build/Insurance.json');

use(solidity)

describe('Insurnace Contract', () => {
    const [contractDeloyer, admin, wallet1, wallet2] = new MockProvider().getWallets();
    var deployedContract;

    beforeEach(async () => {
      deployedContract = await deployContract(contractDeloyer, testContract);
    });

    it('Contract Deployer should become admin', async () => {
      expect(await deployedContract.admin(contractDeloyer.address)).to.equal(true)
    })

    it('Admin can add another admin', async () => {
      expect(await deployedContract.admin(admin.address)).to.equal(false)
      await deployedContract.AdminAdd(admin.address)
      expect(await deployedContract.admin(admin.address)).to.equal(true)
    });

    it('Non admin users cannot add admin', async () => {
      const connectedWallet1 = deployedContract.connect(wallet1)
      expect(await connectedWallet1.admin(admin.address)).to.equal(false)
      await expect(connectedWallet1.AdminAdd(admin)).to.be.reverted
      expect(await connectedWallet1.admin(admin.address)).to.equal(true)
    })
})