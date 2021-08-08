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
      expect(await deployedContract.numberOfAdmins()).to.equal(1)
    })

    it('Admin can add another admin', async () => {
      expect(await deployedContract.admin(admin.address)).to.equal(false)
      await deployedContract.AdminAdd(admin.address)
      expect(await deployedContract.admin(admin.address)).to.equal(true)
      expect(await deployedContract.numberOfAdmins()).to.equal(2)
    });

    it('Non admin users cannot add admin', async () => {
      const connectedWallet1 = deployedContract.connect(wallet1)
      expect(await connectedWallet1.admin(admin.address)).to.equal(false)
      await expect(connectedWallet1.AdminAdd(admin)).to.be.reverted
      expect(await connectedWallet1.admin(admin.address)).to.equal(false)
    })

    it('Admin can resign another admin', async() => {
      await deployedContract.AdminAdd(admin.address)
      const connectedAdmin = deployedContract.connect(admin)
      await connectedAdmin.AdminResign(contractDeloyer.address)
      expect(await deployedContract.numberOfAdmins()).to.equal(1)
      expect(await deployedContract.admin(contractDeloyer.address)).to.equal(false)
    })

    it('Non admin cannot resign', async () => {
      const connectedWallet1 = deployedContract.connect(wallet1)
      await expect(connectedWallet1.AdminResign(wallet1.address)).to.be.reverted
      await expect(connectedWallet1.AdminResign(contractDeloyer.address)).to.be.reverted
    })

    it('If only 1 admin, that admin cannot resign', async () => {
      expect(await deployedContract.numberOfAdmins()).to.equal(1)
      await expect(deployedContract.AdminResign(contractDeloyer.address)).to.be.reverted
      expect(await deployedContract.numberOfAdmins()).to.equal(1)
      expect(await deployedContract.admin(contractDeloyer.address)).to.equal(true)
    })

    it('Admin can sign member up', async () => {
      expect(await deployedContract.numberOfMembers()).to.equal(0)
      await deployedContract.MemberSignUp(wallet1.address, 1)
      expect(await deployedContract.numberOfMembers()).to.equal(1)
      expect(await deployedContract.memberIsOfRank(wallet1.address)).to.equal(1)
    })

    it('Member cannot sign up another member', async () => {
      const connectedWallet1 = deployedContract.connect(wallet1)
      expect(await connectedWallet1.numberOfMembers()).to.equal(0)
      await expect(connectedWallet1.MemberSignUp(wallet1.address, 1)).to.be.reverted
      expect(await connectedWallet1.numberOfMembers()).to.equal(0)
      expect(await connectedWallet1.memberIsOfRank(wallet1.address)).to.equal(0)
    })

    it('Admin can change member rank', async () => {
      expect(await deployedContract.numberOfMembers()).to.equal(0)
      await deployedContract.MemberSignUp(wallet1.address, 1)
      expect(await deployedContract.numberOfMembers()).to.equal(1)
      expect(await deployedContract.memberIsOfRank(wallet1.address)).to.equal(1)
      await deployedContract.MemberChangeRank(wallet1.address, 2)
      expect(await deployedContract.memberIsOfRank(wallet1.address)).to.equal(2)
    })

    it('Member can change their own rank', async () => {
      await deployedContract.MemberSignUp(wallet2.address, 1)
      await deployedContract.MemberSignUp(wallet1.address, 1)
      const connectedWallet1 = deployedContract.connect(wallet1)
      await connectedWallet1.MemberChangeRank(wallet1.address, 2)
      expect(await deployedContract.memberIsOfRank(wallet1.address)).to.equal(2)
    })
    
    it('Member cannot change the rank of some other member', async () => { 
      await deployedContract.MemberSignUp(wallet2.address, 1)
      await deployedContract.MemberSignUp(wallet1.address, 1)
      const connectedWallet1 = deployedContract.connect(wallet1)
      await expect(connectedWallet1.MemberChangeRank(wallet2.address, 2)).to.be.reverted
    })
})