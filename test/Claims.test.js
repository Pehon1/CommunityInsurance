const {expect, use} = require('chai');
const {ContractFactory, ethers} = require('ethers');
// const {deployMockContract} = require('@ethereum-waffle/mock-contract');
//const IERC20 = require('../build/IERC20');
const {deployContract, MockProvider, solidity} = require('ethereum-waffle')
const insurance = require('../build/Insurance.json');
const claims = require('../build/Claims.json');

const ERC20 = require('../build/SimpleToken.json');

use(solidity)

describe('Claims Contract', () => {
    const [contractDeloyer, admin, wallet1, wallet2] = new MockProvider().getWallets();
    
    var insuranceContract;
    var claimsContract;
    var mockERC20;

    const customGasOptions = { gasPrice: 1, gasLimit: 200000, value: 0 }

    beforeEach(async () => {
      // mockERC20 = await deployMockContract(contractDeloyer, IERC20.abi);
      mockERC20 =  await deployContract(contractDeloyer, ERC20)
      // distribute the money
      Promise.all([
        await mockERC20.transfer(admin.address, 200),
        await mockERC20.transfer(wallet1.address, 200),
        await mockERC20.transfer(wallet2.address, 200),
      ])
      insuranceContract = await deployContract(contractDeloyer, insurance, [mockERC20.address]);
      claimsContract = new ethers.Contract(insuranceContract.claims(), claims.abi, contractDeloyer)
    })

    it('Admin can trigger claims event for member', async () => {
      // admin signs up 2 members
      await insuranceContract.AdminSignupMember(wallet1.address, 1)
      await insuranceContract.AdminSignupMember(wallet2.address, 1)
      // admin triggers claim event
      await insuranceContract.AdminTriggerClaimEvent(wallet1.address)
      // check that claim event was indeed created.
      const claimEvent = await claimsContract.claimEvents(0)
      expect(claimEvent.claimAddress).to.be.equal(wallet1.address)
      expect(claimEvent.contributionsSoFar).to.be.equal(0)
      expect(claimEvent.openForContribution).to.be.equal(true)

      // check number of claim events is added
      expect(await claimsContract.numberOfClaimEvents()).to.be.equal(1)

      // check that the membership freeze is in effect
      expect(await insuranceContract.membershipFreeze()).to.be.equal(true)

      // for the hack of it, try to add a member
      await expect(insuranceContract.AdminSignupMember(wallet1.address, 1, customGasOptions)).to.be.revertedWith('Membership freeze is in effect')
    })

    it('Claim event cannot be triggered for non members', async () => {
      // admin signs up 2 members
      await insuranceContract.AdminSignupMember(wallet1.address, 1)
      await insuranceContract.AdminSignupMember(wallet2.address, 1)
      // admin tries to trigger claim event for non member
      await expect(insuranceContract.AdminTriggerClaimEvent(admin.address)).to.be.revertedWith("Address not member")
      // checking all is correct. 
      const claimEvent = await claimsContract.claimEvents(0)
      expect(claimEvent.claimAddress).to.be.equal('0x0000000000000000000000000000000000000000')
      expect(claimEvent.contributionsSoFar).to.be.equal(0)
      
      // check number of claim events is added
      expect(await claimsContract.numberOfClaimEvents()).to.be.equal(0)
    })

    it('Member can contribute to claims event', async () => {
      // admin signs up 2 members
      await insuranceContract.AdminSignupMember(wallet1.address, 1)
      await insuranceContract.AdminSignupMember(wallet2.address, 1)
      // admin triggers claim event
      await insuranceContract.AdminTriggerClaimEvent(wallet1.address)
      // user 2 sends approval to spend
      const user2ERC20 = mockERC20.connect(wallet2)
      await user2ERC20.approve(claimsContract.address, 200)

      expect(await user2ERC20.allowance(wallet2.address, claimsContract.address)).to.be.equal(200)

      // user2 connects to the claim contract
      const user2ClaimsContract = claimsContract.connect(wallet2)
      // user 2 contributes to the claim
      await user2ClaimsContract.contributeToClaim(0)

      // checks the balance in the contract
      expect(await mockERC20.balanceOf(claimsContract.address)).to.be.equal(200)
      // checks the balance in user2
      expect(await mockERC20.balanceOf(wallet2.address)).to.be.equal(0)

      // checks that the claim event parameter is updatd
      const claimEvent = await claimsContract.claimEvents(0)
      expect(claimEvent.claimAddress).to.be.equal(wallet1.address)
      expect(claimEvent.contributionsSoFar).to.be.equal(200)
      expect(await user2ClaimsContract.contributionsToClaim(0, wallet2.address)).to.be.equal(200)
    })

    it('Non Member cannot contribute to claims event', async () => {
      // admin signs up 2 members
      await insuranceContract.AdminSignupMember(wallet1.address, 1)
      await insuranceContract.AdminSignupMember(wallet2.address, 1)
      // admin triggers claim event
      await insuranceContract.AdminTriggerClaimEvent(wallet1.address)
      // user 2 sends approval to spend
      const user2ERC20 = mockERC20.connect(admin)
      await user2ERC20.approve(claimsContract.address, 200)

      expect(await user2ERC20.allowance(admin.address, claimsContract.address)).to.be.equal(200)

      // user2 connects to the claim contract
      const user2ClaimsContract = claimsContract.connect(admin)
      // user 2 contributes to the claim
      await expect(user2ClaimsContract.contributeToClaim(0)).to.be.revertedWith("Address not member")
    })

    it('Contributing to unknown claim', async () => {
      // admin signs up 2 members
      await insuranceContract.AdminSignupMember(wallet1.address, 1)
      await insuranceContract.AdminSignupMember(wallet2.address, 1)
      // admin triggers claim event
      await insuranceContract.AdminTriggerClaimEvent(wallet1.address)
      // user 2 sends approval to spend
      const user2ERC20 = mockERC20.connect(admin)
      await user2ERC20.approve(claimsContract.address, 200)
      // user2 connects to the claim contract
      const user2ClaimsContract = claimsContract.connect(admin)
      // user 2 contributes to a wrong claim
      await expect(user2ClaimsContract.contributeToClaim(1)).to.be.revertedWith("Address not member")

      // checks that the claim event parameter is updatd
      const claimEvent = await claimsContract.claimEvents(1)
      expect(claimEvent.claimAddress).to.be.equal("0x0000000000000000000000000000000000000000")
      expect(claimEvent.contributionsSoFar).to.be.equal(0)
      expect(await user2ClaimsContract.contributionsToClaim(0, wallet2.address)).to.be.equal(0)
    })

    it('Member cannot contribute to claims event that closed', async () => {
      // admin signs up 2 members
      await insuranceContract.AdminSignupMember(wallet1.address, 1)
      await insuranceContract.AdminSignupMember(wallet2.address, 1)
      
      // admin triggers claim event
      await insuranceContract.AdminTriggerClaimEvent(wallet1.address)

      // membership freeze should be in effect
      expect(await insuranceContract.membershipFreeze()).to.be.equal(true)

      // admin triggers claim closure event
      await insuranceContract.AdminCloseClaimEvent(0, customGasOptions)

      // membership freeze should be stopped
      expect(await insuranceContract.membershipFreeze()).to.be.equal(false) 

      // user 2 sends approval to spend
      const user2ERC20 = mockERC20.connect(wallet2)
      await user2ERC20.approve(claimsContract.address, 200)

      expect(await user2ERC20.allowance(wallet2.address, claimsContract.address)).to.be.equal(200)

      // user2 connects to the claim contract
      const user2ClaimsContract = claimsContract.connect(wallet2)
      // user 2 contributes to the claim
      await expect(user2ClaimsContract.contributeToClaim(0)).to.be.revertedWith("Claim event has closed")

      // checks the balance in the contract
      expect(await mockERC20.balanceOf(claimsContract.address)).to.be.equal(0)
      // checks the balance in user2
      expect(await mockERC20.balanceOf(wallet2.address)).to.be.equal(200)

      // checks that the claim event parameter is correct
      const claimEvent = await claimsContract.claimEvents(0)
      expect(claimEvent.claimAddress).to.be.equal(wallet1.address)
      expect(claimEvent.contributionsSoFar).to.be.equal(0)
      expect(await user2ClaimsContract.contributionsToClaim(0, wallet2.address)).to.be.equal(0)
    })

    it('Closing the claim transfer the money correctly. ', async () => {
      // admin signs up 2 members
      await insuranceContract.AdminSignupMember(wallet1.address, 1)
      await insuranceContract.AdminSignupMember(wallet2.address, 1)

      // test to make sure this account's balance is really the inital setup amount
      expect(await mockERC20.balanceOf(wallet1.address)).to.be.equal(200)

      // admin triggers claim event
      await insuranceContract.AdminTriggerClaimEvent(wallet1.address)
      
      // user 2 sends approval to spend
      const user2ERC20 = mockERC20.connect(wallet2)
      await user2ERC20.approve(claimsContract.address, 200)

      expect(await user2ERC20.allowance(wallet2.address, claimsContract.address)).to.be.equal(200)

      // user2 connects to the claim contract
      const user2ClaimsContract = claimsContract.connect(wallet2)
      // user 2 contributes to the claim
      await user2ClaimsContract.contributeToClaim(0, customGasOptions)

      // checks that the contract address balance is correct
      expect(await mockERC20.balanceOf(claimsContract.address)).to.be.equal(200)

      // admin now closes the claim event
      await insuranceContract.AdminCloseClaimEvent(0, customGasOptions)

      // check that contract balance is 0
      expect(await mockERC20.balanceOf(claimsContract.address)).to.be.equal(0)
      // check that claimer balance is +200
      expect(await mockERC20.balanceOf(wallet1.address)).to.be.equal(400)

      // check that mmebership is indeed open for changes again
      expect(await insuranceContract.membershipFreeze()).to.be.equal(false)
    })

    it('Admin clising unknown claim', async () => {
      // admin signs up 2 members
      await insuranceContract.AdminSignupMember(wallet1.address, 1)
      await insuranceContract.AdminSignupMember(wallet2.address, 1)
      // admin triggers claim event
      await insuranceContract.AdminTriggerClaimEvent(wallet1.address)
      // admin triggers claim closure event
      await expect(insuranceContract.AdminCloseClaimEvent(1, customGasOptions)).to.be.revertedWith('Claim doesn\'t exist')
    })

    it('Closing the claim transfer the money correctly. ', async () => {
      // admin signs up 2 members
      await insuranceContract.AdminSignupMember(wallet1.address, 1)
      await insuranceContract.AdminSignupMember(wallet2.address, 1)

      // test to make sure this account's balance is really the inital setup amount
      expect(await mockERC20.balanceOf(wallet1.address)).to.be.equal(200)

      // admin triggers claim event
      await insuranceContract.AdminTriggerClaimEvent(wallet1.address)
      // admin now closes the claim event
      await insuranceContract.AdminCloseClaimEvent(0, customGasOptions)
      // admin tries to close the event again
      await expect(insuranceContract.AdminCloseClaimEvent(0, customGasOptions)).to.be.revertedWith('Claim event has closed')
    })
})