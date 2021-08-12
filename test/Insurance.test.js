const {expect, use} = require('chai');
const {ContractFactory, ethers} = require('ethers');
const {deployMockContract} = require('@ethereum-waffle/mock-contract');
const IERC20 = require('../build/IERC20');
const {deployContract, MockProvider, solidity} = require('ethereum-waffle')
const insurance = require('../build/Insurance.json');
const membership = require('../build/Membership.json');
const Claims = require('../build/Claims.json');

use(solidity)

describe('Insurance Contract', () => {
    const [contractDeloyer, admin, wallet1, wallet2] = new MockProvider().getWallets();
    var insuranceContract;
    var membershipContract;
    var claimsContract;

    const customGasOptions = { gasPrice: 1, gasLimit: 200000, value: 0 }

    beforeEach(async () => {
      const mockERC20 = await deployMockContract(contractDeloyer, IERC20.abi);
      insuranceContract = await deployContract(contractDeloyer, insurance, [mockERC20.address]);
      membershipContract = new ethers.Contract(insuranceContract.membership(), membership.abi, contractDeloyer)
      claimsContract = new ethers.Contract(insuranceContract.claims(), Claims.abi, contractDeloyer)
    })

    it('Admin can change minimum contribution amounts', async () => {
      expect(await claimsContract.ranksToContributionMinimum(1)).to.be.equal(300)
      await insuranceContract.AdminSetMinimumContributionFor(1, 500)
      expect(await claimsContract.ranksToContributionMinimum(1)).to.be.equal(500)
      expect(await claimsContract.ranksToContributionMinimum(2)).to.be.equal(200)
      await insuranceContract.AdminSetMinimumContributionFor(2, 501)
      expect(await claimsContract.ranksToContributionMinimum(2)).to.be.equal(501)
      expect(await claimsContract.ranksToContributionMinimum(3)).to.be.equal(200)
      await insuranceContract.AdminSetMinimumContributionFor(3, 502)
      expect(await claimsContract.ranksToContributionMinimum(3)).to.be.equal(502)
    })

    it('Admin cannot change minimum amount for No rank', async () => {
      expect(await claimsContract.ranksToContributionMinimum(0)).to.be.equal(0)
      await expect(insuranceContract.AdminSetMinimumContributionFor(0, 500)).to.be.revertedWith('Cannot set amount for Rank - None')
    })

    it('Admin cannot change minimum amount when membership is frozen', async () => {
      await insuranceContract.SetFreezeOnMemberChange(true)
      expect(await claimsContract.ranksToContributionMinimum(1)).to.be.equal(300)
      await expect(insuranceContract.AdminSetMinimumContributionFor(1, 500)).to.be.revertedWith('Membership freeze is in effect')
    })

    it('Contract Deployer should become admin', async () => {
      // check that the admin's address is registered
      expect(await insuranceContract.admin(contractDeloyer.address)).to.equal(true)
      // checks that the number of admins is 1
      expect(await insuranceContract.numberOfAdmins()).to.equal(1)
    })

    it('Admin can add another admin', async () => {
      // check that the address isnt currently an admin.
      expect(await insuranceContract.admin(admin.address)).to.equal(false)
      // add the address in.
      await insuranceContract.AdminAdd(admin.address)
      // check that the address is now an admin.
      expect(await insuranceContract.admin(admin.address)).to.equal(true)
      // count to make sure the number of admins is 2 
      expect(await insuranceContract.numberOfAdmins()).to.equal(2)
    });

    it('Non admin users cannot add admin', async () => {
      // connect to contract with a user. 
      const connectedWallet1 = insuranceContract.connect(wallet1)
      // checks that the address isn't an admin yet. 
      expect(await connectedWallet1.admin(admin.address)).to.equal(false)
      // user tries to add admin, and it should be reverted. 
      await expect(connectedWallet1.AdminAdd(admin)).to.be.reverted
      // check that the added address is indeed not succcessful. 
      expect(await connectedWallet1.admin(admin.address)).to.equal(false)
    })

    it('Admin can resign another admin', async() => {
      // owner adds admin in. 
      await insuranceContract.AdminAdd(admin.address)
      // admin admin now connects to the contract
      const connectedAdmin = insuranceContract.connect(admin)
      // admin tries to resign another user
      await connectedAdmin.AdminResign(contractDeloyer.address)
      // check that the number of admins is now 1
      expect(await insuranceContract.numberOfAdmins()).to.equal(1)
      // check that the admin is indeed resigned. 
      expect(await insuranceContract.admin(contractDeloyer.address)).to.equal(false)
    })

    it('Non admin cannot resign', async () => {
      // adds admin in first, so that total admins is 2
      await insuranceContract.AdminAdd(admin.address)
      // user connects to the contract
      const connectedWallet1 = insuranceContract.connect(wallet1)
      // user tries to resign a non admin.
      await expect(connectedWallet1.AdminResign(wallet1.address)).to.be.reverted
      // user tries to resign an admin.
      await expect(connectedWallet1.AdminResign(contractDeloyer.address)).to.be.reverted
    })

    it('If only 1 admin, that admin cannot resign', async () => {
      // makes sure we only ahve 1 admin as a start.
      expect(await insuranceContract.numberOfAdmins()).to.equal(1)
      // owner tries to resign himselve. Expect it to fail since cannot have 0 admins.
      await expect(insuranceContract.AdminResign(contractDeloyer.address)).to.be.reverted
      // check that the number of admins is indeed 1.
      expect(await insuranceContract.numberOfAdmins()).to.equal(1)
      // check that the owner is still the admin.
      expect(await insuranceContract.admin(contractDeloyer.address)).to.equal(true)
    })

    it('Admin can sign member up', async () => {
      // check thats number of members is indeed 0
      expect(await insuranceContract.readMemberLength()).to.equal(0)
      // admin signs up a member
      await insuranceContract.AdminSignupMember(wallet1.address, 1)
      // check we have 1 member. 
      expect(await insuranceContract.readMemberLength()).to.equal(1)
      // check that the member is the one we just added.
      expect(await insuranceContract.readMemberIsOfRank(wallet1.address)).to.equal(1)
    })

    it('Admin can change member rank', async () => {
      // check thats number of members is indeed 0
      expect(await insuranceContract.readMemberLength()).to.equal(0)
      // admin signs up member. 
      await insuranceContract.AdminSignupMember(wallet1.address, 1)
      // check number of member 
      expect(await insuranceContract.readMemberLength()).to.equal(1)
      // read the rank of the member
      expect(await insuranceContract.readMemberIsOfRank(wallet1.address)).to.equal(1)
      // admin changes the rank.
      await insuranceContract.AdminChangeMemberRank(wallet1.address, 2)
      // rank change successful. 
      expect(await insuranceContract.readMemberIsOfRank(wallet1.address)).to.equal(2)
    })

    it('Member cannot change their own rank', async () => {
      // admin signs up amother member
      await insuranceContract.AdminSignupMember(wallet1.address, 1)
      // admin sign up a member
      await insuranceContract.AdminSignupMember(wallet2.address, 1)
      // member 1 connects to the contract.
      const connectedWallet1 = insuranceContract.connect(wallet1)
      // member 1 tries to change his own rank.
      await expect(connectedWallet1.AdminChangeMemberRank(wallet1.address, 2)).to.be.reverted
    })
    
    it('Member cannot change the rank of some other member', async () => { 
      // admin signs up amother member
      await insuranceContract.AdminSignupMember(wallet1.address, 1)
      // admin sign up a member
      await insuranceContract.AdminSignupMember(wallet2.address, 1)
      // member 1 connects to the contract.
      const connectedWallet1 = insuranceContract.connect(wallet1)
      // member 1 tries to change his own rank.
      await expect(connectedWallet1.AdminChangeMemberRank(wallet2.address, 2)).to.be.reverted
    })

    it('Admin can change Freeze status', async () => {
      expect(await insuranceContract.membershipFreeze()).to.be.equal(false)
      await insuranceContract.SetFreezeOnMemberChange(true)
      expect(await insuranceContract.membershipFreeze()).to.be.equal(true)
    })

    it('Non admin cannot change Freeze status', async () => {
      expect(await insuranceContract.membershipFreeze()).to.be.equal(false)
      // member 1 connects to the contract.
      const connectedWallet1 = insuranceContract.connect(wallet1)
      await expect(connectedWallet1.SetFreezeOnMemberChange(true)).to.be.revertedWith('Only admin can do this')
      expect(await insuranceContract.membershipFreeze()).to.be.equal(false)
    })

    it('Frozen membership cannot add resign or change members', async () => {
      // admin signs up amother member
      await insuranceContract.AdminSignupMember(wallet1.address, 1)
      // admin freezes membership change
      await insuranceContract.SetFreezeOnMemberChange(true)
      // admin signs up another user
      await expect(insuranceContract.AdminSignupMember(wallet2.address, 1)).to.be.revertedWith("Membership freeze is in effect")
      // admin resignsa user
      await expect(insuranceContract.AdminResignMember(wallet1.address)).to.be.revertedWith("Membership freeze is in effect")
      // admin changes the rank of the user.
      await expect(insuranceContract.AdminChangeMemberRank(wallet2.address, 2)).to.be.revertedWith("Membership freeze is in effect")
    })

    it('Triggering claim event freezes membership change', async () => {
      // admin signs up 2 members
      await insuranceContract.AdminSignupMember(wallet1.address, 1)
      await insuranceContract.AdminSignupMember(wallet2.address, 1)
      // admin triggers claim event
      await insuranceContract.AdminTriggerClaimEvent(wallet1.address)
      // check that the membership freeze is in effect
      expect(await insuranceContract.membershipFreeze()).to.be.equal(true)
      // for the hack of it, try to add a member
      await expect(insuranceContract.AdminSignupMember(wallet1.address, 1, customGasOptions)).to.be.revertedWith('Membership freeze is in effect')
    })

    it('Closing claim event unfreezes membership change', async () => {
      // admin signs up 2 members
      await insuranceContract.AdminSignupMember(wallet1.address, 1)
      await insuranceContract.AdminSignupMember(wallet2.address, 1)
      // admin triggers claim event
      await insuranceContract.AdminTriggerClaimEvent(wallet2.address, customGasOptions)
      // admin closes claim event
      await insuranceContract.AdminCloseClaimEvent(0, customGasOptions)
      // check that the membership freeze is no longer in effect
      expect(await insuranceContract.membershipFreeze()).to.be.equal(false)
    })

    it('User cannot trigger claim event', async () => {
      // admin signs up 2 members
      await insuranceContract.AdminSignupMember(admin.address, 1)
      await insuranceContract.AdminSignupMember(wallet2.address, 1)
      // user connects to the contract
      const userConnected = insuranceContract.connect(wallet1)
      // user triggers claim event
      await expect(userConnected.AdminTriggerClaimEvent(wallet2.address, customGasOptions)).to.be.revertedWith('Only admin can do this')
    })

    it('User cannot close claim event', async () => {
      // admin signs up 2 members
      await insuranceContract.AdminSignupMember(admin.address, 1)
      await insuranceContract.AdminSignupMember(wallet2.address, 1)
      // admin triggers claim event
      await insuranceContract.AdminTriggerClaimEvent(wallet2.address, customGasOptions)
      // user connects to the contract
      const userConnected = insuranceContract.connect(wallet1)
      // user tries to close the contract
      await expect(userConnected.AdminCloseClaimEvent(0, customGasOptions)).to.be.revertedWith('Only admin can do this')
    })

    it('If there is one open claim event left during closure of another, membership change will remain frozen.', async () => {
      // admin signs up 2 members
      await insuranceContract.AdminSignupMember(wallet1.address, 1)
      await insuranceContract.AdminSignupMember(wallet2.address, 1)
      // admin triggers claim event
      await insuranceContract.AdminTriggerClaimEvent(wallet1.address, customGasOptions)
      await insuranceContract.AdminTriggerClaimEvent(wallet2.address, customGasOptions)
      // admin closes one of the claim event
      await insuranceContract.AdminCloseClaimEvent(0)
      // check that membership freeze is still in effect
      expect(await insuranceContract.membershipFreeze()).to.be.true
      // tries to add a member
      await expect(insuranceContract.AdminSignupMember(admin.address, 1, customGasOptions)).to.be.revertedWith('Membership freeze is in effect')
      // admin closes the last of the claim event
      await insuranceContract.AdminCloseClaimEvent(1)
      // check that membership freeze is still in effect
      expect(await insuranceContract.membershipFreeze()).to.be.false
    })
  
})