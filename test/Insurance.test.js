const {expect, use} = require('chai');
const {Contract} = require('ethers');

const {deployContract, MockProvider, solidity} = require('ethereum-waffle')
const testContract = require('../build/Insurance.json');
const membership = require('../build/Membership.json');

use(solidity)

describe('Insurance Contract', () => {
    const [contractDeloyer, admin, wallet1, wallet2] = new MockProvider().getWallets();
    var deployedContract;

    beforeEach(async () => {
      deployedContract = await deployContract(contractDeloyer, testContract);
    });

    it('Contract Deployer should become admin', async () => {
      // check that the admin's address is registered
      expect(await deployedContract.admin(contractDeloyer.address)).to.equal(true)
      // checks that the number of admins is 1
      expect(await deployedContract.numberOfAdmins()).to.equal(1)
    })

    it('Admin can add another admin', async () => {
      // check that the address isnt currently an admin.
      expect(await deployedContract.admin(admin.address)).to.equal(false)
      // add the address in.
      await deployedContract.AdminAdd(admin.address)
      // check that the address is now an admin.
      expect(await deployedContract.admin(admin.address)).to.equal(true)
      // count to make sure the number of admins is 2 
      expect(await deployedContract.numberOfAdmins()).to.equal(2)
    });

    it('Non admin users cannot add admin', async () => {
      // connect to contract with a user. 
      const connectedWallet1 = deployedContract.connect(wallet1)
      // checks that the address isn't an admin yet. 
      expect(await connectedWallet1.admin(admin.address)).to.equal(false)
      // user tries to add admin, and it should be reverted. 
      await expect(connectedWallet1.AdminAdd(admin)).to.be.reverted
      // check that the added address is indeed not succcessful. 
      expect(await connectedWallet1.admin(admin.address)).to.equal(false)
    })

    it('Admin can resign another admin', async() => {
      // owner adds admin in. 
      await deployedContract.AdminAdd(admin.address)
      // admin admin now connects to the contract
      const connectedAdmin = deployedContract.connect(admin)
      // admin tries to resign another user
      await connectedAdmin.AdminResign(contractDeloyer.address)
      // check that the number of admins is now 1
      expect(await deployedContract.numberOfAdmins()).to.equal(1)
      // check that the admin is indeed resigned. 
      expect(await deployedContract.admin(contractDeloyer.address)).to.equal(false)
    })

    it('Non admin cannot resign', async () => {
      // adds admin in first, so that total admins is 2
      await deployedContract.AdminAdd(admin.address)
      // user connects to the contract
      const connectedWallet1 = deployedContract.connect(wallet1)
      // user tries to resign a non admin.
      await expect(connectedWallet1.AdminResign(wallet1.address)).to.be.reverted
      // user tries to resign an admin.
      await expect(connectedWallet1.AdminResign(contractDeloyer.address)).to.be.reverted
    })

    it('If only 1 admin, that admin cannot resign', async () => {
      // makes sure we only ahve 1 admin as a start.
      expect(await deployedContract.numberOfAdmins()).to.equal(1)
      // owner tries to resign himselve. Expect it to fail since cannot have 0 admins.
      await expect(deployedContract.AdminResign(contractDeloyer.address)).to.be.reverted
      // check that the number of admins is indeed 1.
      expect(await deployedContract.numberOfAdmins()).to.equal(1)
      // check that the owner is still the admin.
      expect(await deployedContract.admin(contractDeloyer.address)).to.equal(true)
    })

    it('Admin can sign member up', async () => {
      // check thats number of members is indeed 0
      expect(await deployedContract.readMemberLength()).to.equal(0)
      // admin signs up a member
      await deployedContract.AdminSignupMember(wallet1.address, 1)
      // check we have 1 member. 
      expect(await deployedContract.readMemberLength()).to.equal(1)
      // check that the member is the one we just added.
      expect(await deployedContract.readMemberIsOfRank(wallet1.address)).to.equal(1)
    })

    it('Admin can change member rank', async () => {
      // check thats number of members is indeed 0
      expect(await deployedContract.readMemberLength()).to.equal(0)
      // admin signs up member. 
      await deployedContract.AdminSignupMember(wallet1.address, 1)
      // check number of member 
      expect(await deployedContract.readMemberLength()).to.equal(1)
      // read the rank of the member
      expect(await deployedContract.readMemberIsOfRank(wallet1.address)).to.equal(1)
      // admin changes the rank.
      await deployedContract.AdminChangeMemberRank(wallet1.address, 2)
      // rank change successful. 
      expect(await deployedContract.readMemberIsOfRank(wallet1.address)).to.equal(2)
    })

    it('Member cannot change their own rank', async () => {
      // admin signs up amother member
      await deployedContract.AdminSignupMember(wallet1.address, 1)
      // admin sign up a member
      await deployedContract.AdminSignupMember(wallet2.address, 1)
      // member 1 connects to the contract.
      const connectedWallet1 = deployedContract.connect(wallet1)
      // member 1 tries to change his own rank.
      await expect(connectedWallet1.AdminChangeMemberRank(wallet1.address, 2)).to.be.reverted
    })
    
    it('Member cannot change the rank of some other member', async () => { 
      // admin signs up amother member
      await deployedContract.AdminSignupMember(wallet1.address, 1)
      // admin sign up a member
      await deployedContract.AdminSignupMember(wallet2.address, 1)
      // member 1 connects to the contract.
      const connectedWallet1 = deployedContract.connect(wallet1)
      // member 1 tries to change his own rank.
      await expect(connectedWallet1.AdminChangeMemberRank(wallet2.address, 2)).to.be.reverted
    })
})