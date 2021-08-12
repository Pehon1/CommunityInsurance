const {expect, use} = require('chai');
const {ContractFactory, ethers} = require('ethers');
// const {deployMockContract} = require('@ethereum-waffle/mock-contract');
//const IERC20 = require('../build/IERC20');
const {deployContract, MockProvider, solidity} = require('ethereum-waffle')
const insurance = require('../build/Insurance.json');
const claims = require('../build/Claims.json');
const membership = require('../build/Membership.json');

const ERC20 = require('../build/SimpleToken.json');

use(solidity)

describe('Claims Contract', () => {
    const [contractDeloyer, admin, wallet1, wallet2, wallet3, wallet4, wallet5] = new MockProvider().getWallets();
    
    var insuranceContract;
    var membershipContract;
    var claimsContract;
    var mockERC20;

    const customGasOptions = { gasPrice: 1, gasLimit: 200000, value: 0 }

    beforeEach(async () => {
      mockERC20 =  await deployContract(contractDeloyer, ERC20)
      // distribute the money
      Promise.all([
        await mockERC20.transfer(admin.address, 1000),
        await mockERC20.transfer(wallet1.address, 1000),
        await mockERC20.transfer(wallet2.address, 1000),
        await mockERC20.transfer(wallet3.address, 1000),
        await mockERC20.transfer(wallet4.address, 1000),
        await mockERC20.transfer(wallet5.address, 100),
      ])

      // deploying all 3 contracts
      insuranceContract = await deployContract(contractDeloyer, insurance);
      claimsContract = await deployContract(contractDeloyer, claims, [mockERC20.address])
      membershipContract = await deployContract(contractDeloyer, membership)

      // linking insurance contract to its related contracts.
      await insuranceContract.SetLinkedContracts(membershipContract.address, claimsContract.address)
      
      // linking claims contract
      await claimsContract.SetLinkedContracts(membershipContract.address, insuranceContract.address)
      // setting owner of claims contract to insurance contract
      await claimsContract.transferOwnership(insuranceContract.address)

      // linking membership contract
      await membershipContract.SetLinkedContracts(insuranceContract.address)
      // setting owner of contract to insurance contract
      await membershipContract.transferOwnership(insuranceContract.address)
    })

    it('Non member should not be allowed to set contract addresses', async () => {
      // user 1 connects to the address
      const user1ConnectedToContract = await claimsContract.connect(wallet1)
      await expect(user1ConnectedToContract.SetLinkedContracts(membershipContract.address, membershipContract.address)).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('Member of different ranks contribute correct amounts', async () => {
      Promise.all([
        // admin signs up 2 members
        await insuranceContract.AdminSignupMember(wallet1.address, 1, customGasOptions),
        await insuranceContract.AdminSignupMember(wallet2.address, 2, customGasOptions),
        await insuranceContract.AdminSignupMember(wallet3.address, 3, customGasOptions),
        await insuranceContract.AdminSignupMember(wallet4.address, 1, customGasOptions),
        // admin triggers claim event
        await insuranceContract.AdminTriggerClaimEvent(wallet4.address, customGasOptions),
      ])
      expect(await claimsContract.memberMinimumContributionAmount(wallet1.address)).to.be.equal(300)
      expect(await claimsContract.memberMinimumContributionAmount(wallet2.address)).to.be.equal(200)
      expect(await claimsContract.memberMinimumContributionAmount(wallet3.address)).to.be.equal(200)

      //user 1 sends approval to spend
      const user1ERC20 = mockERC20.connect(wallet1)
      await user1ERC20.approve(claimsContract.address, 500)
      const user1ClaimsContract = claimsContract.connect(wallet1)

      //user 2 sends approval to spend
      const user2ERC20 = mockERC20.connect(wallet2)
      await user2ERC20.approve(claimsContract.address, 500)
      const user2ClaimsContract = claimsContract.connect(wallet2)

      //user 3 sends approval to spend
      const user3ERC20 = mockERC20.connect(wallet3)
      await user3ERC20.approve(claimsContract.address, 500)
      const user3ClaimsContract = claimsContract.connect(wallet3)

      // user 1 contributes to the claim
      await user1ClaimsContract.contributeToClaim(0)
      // user 2 contributes to the claim
      await user2ClaimsContract.contributeToClaim(0)
      // user 3 contributes to the claim
      await user3ClaimsContract.contributeToClaim(0)

      // checks the balance in the contract
      expect(await mockERC20.balanceOf(claimsContract.address)).to.be.equal(700)
      // checks the balance in user1
      expect(await mockERC20.balanceOf(wallet1.address)).to.be.equal(700)
      expect(await mockERC20.balanceOf(wallet2.address)).to.be.equal(800)
      expect(await mockERC20.balanceOf(wallet3.address)).to.be.equal(800)

      // checks that the claim event parameter is updatd
      const claimEvent = await claimsContract.claimEvents(0)
      expect(claimEvent.claimAddress).to.be.equal(wallet4.address)
      expect(claimEvent.contributionsSoFar).to.be.equal(700)
      expect(await user1ClaimsContract.contributionsToClaim(0, wallet1.address)).to.be.equal(300)
      expect(await user1ClaimsContract.contributionsToClaim(0, wallet2.address)).to.be.equal(200)
      expect(await user1ClaimsContract.contributionsToClaim(0, wallet3.address)).to.be.equal(200)
    })

    it('Makes a contribution when account has too little money', async () => {
      Promise.all([
        // admin signs up 2 members
        await insuranceContract.AdminSignupMember(wallet1.address, 1, customGasOptions),
        await insuranceContract.AdminSignupMember(wallet2.address, 2, customGasOptions),
        await insuranceContract.AdminSignupMember(wallet5.address, 3, customGasOptions),
        // admin triggers claim event
        await insuranceContract.AdminTriggerClaimEvent(wallet1.address, customGasOptions),
      ])
      expect(await claimsContract.memberMinimumContributionAmount(wallet1.address)).to.be.equal(300)
      expect(await claimsContract.memberMinimumContributionAmount(wallet2.address)).to.be.equal(200)
      expect(await claimsContract.memberMinimumContributionAmount(wallet5.address)).to.be.equal(200)

      //user 5 sends approval to spend
      const user5ERC20 = mockERC20.connect(wallet5)
      await user5ERC20.approve(claimsContract.address, 500)
      const user5ClaimsContract = claimsContract.connect(wallet5)
      // user 5 contributes to the claim
      await expect(user5ClaimsContract.contributeToClaim(0)).to.revertedWith('ERC20: transfer amount exceeds balance')
    })

    it('Makes sure number of claim event counter is working correctly ', async () => {
      // admin signs up 2 members
      await insuranceContract.AdminSignupMember(admin.address, 1)
      await insuranceContract.AdminSignupMember(wallet1.address, 1)
      await insuranceContract.AdminSignupMember(wallet2.address, 1)
      // check 0 claim events
      expect(await claimsContract.numberOfOpenClaimEvents()).to.be.equal(0)
      // admin triggers claim event
      await insuranceContract.AdminTriggerClaimEvent(wallet1.address)
      //check 1 open clain event
      expect(await claimsContract.numberOfOpenClaimEvents()).to.be.equal(1)
      // admin triggers claim event
      await insuranceContract.AdminTriggerClaimEvent(wallet2.address)
      // check 2 open clain event
      expect(await claimsContract.numberOfOpenClaimEvents()).to.be.equal(2)
      // admin triggers claim event
      await insuranceContract.AdminTriggerClaimEvent(admin.address)
      // check 3 open clain event
      expect(await claimsContract.numberOfOpenClaimEvents()).to.be.equal(3)
      // admin now closes the claim event
      await insuranceContract.AdminCloseClaimEvent(1, customGasOptions)
      // check 2 open clain event
      expect(await claimsContract.numberOfOpenClaimEvents()).to.be.equal(2)
      // admin now closes the claim event
      await insuranceContract.AdminCloseClaimEvent(0, customGasOptions)
      // check 1 open clain event
      expect(await claimsContract.numberOfOpenClaimEvents()).to.be.equal(1)
      // admin now closes the claim event
      await insuranceContract.AdminCloseClaimEvent(2, customGasOptions)
      // check 1 open clain event
      expect(await claimsContract.numberOfOpenClaimEvents()).to.be.equal(0)
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
      await user2ERC20.approve(claimsContract.address, 300)

      expect(await user2ERC20.allowance(wallet2.address, claimsContract.address)).to.be.equal(300)

      // user2 connects to the claim contract
      const user2ClaimsContract = claimsContract.connect(wallet2)
      // user 2 contributes to the claim
      await user2ClaimsContract.contributeToClaim(0)

      // checks the balance in the contract
      expect(await mockERC20.balanceOf(claimsContract.address)).to.be.equal(300)
      // checks the balance in user2
      expect(await mockERC20.balanceOf(wallet2.address)).to.be.equal(700)

      // checks that the claim event parameter is updatd
      const claimEvent = await claimsContract.claimEvents(0)
      expect(claimEvent.claimAddress).to.be.equal(wallet1.address)
      expect(claimEvent.contributionsSoFar).to.be.equal(300)
      expect(await user2ClaimsContract.contributionsToClaim(0, wallet2.address)).to.be.equal(300)
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
      expect(await mockERC20.balanceOf(wallet2.address)).to.be.equal(1000)

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
      expect(await mockERC20.balanceOf(wallet1.address)).to.be.equal(1000)

      // admin triggers claim event
      await insuranceContract.AdminTriggerClaimEvent(wallet1.address)
      
      // user 2 sends approval to spend
      const user2ERC20 = mockERC20.connect(wallet2)
      await user2ERC20.approve(claimsContract.address, 300)

      expect(await user2ERC20.allowance(wallet2.address, claimsContract.address)).to.be.equal(300)

      // user2 connects to the claim contract
      const user2ClaimsContract = claimsContract.connect(wallet2)
      // user 2 contributes to the claim
      await user2ClaimsContract.contributeToClaim(0, customGasOptions)

      // checks that the contract address balance is correct
      expect(await mockERC20.balanceOf(claimsContract.address)).to.be.equal(300)

      // admin now closes the claim event
      await insuranceContract.AdminCloseClaimEvent(0, customGasOptions)

      // check that contract balance is 0
      expect(await mockERC20.balanceOf(claimsContract.address)).to.be.equal(0)
      // check that claimer balance is +200
      expect(await mockERC20.balanceOf(wallet1.address)).to.be.equal(1300)

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
      expect(await mockERC20.balanceOf(wallet1.address)).to.be.equal(1000)

      // admin triggers claim event
      await insuranceContract.AdminTriggerClaimEvent(wallet1.address)
      // admin now closes the claim event
      await insuranceContract.AdminCloseClaimEvent(0, customGasOptions)
      // admin tries to close the event again
      await expect(insuranceContract.AdminCloseClaimEvent(0, customGasOptions)).to.be.revertedWith('Claim event has closed')
    })
})