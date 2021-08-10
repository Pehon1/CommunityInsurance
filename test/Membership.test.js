const {expect, use} = require('chai');
const {ContractFactory, ethers} = require('ethers');
const {deployMockContract} = require('@ethereum-waffle/mock-contract');
const IERC20 = require('../build/IERC20');
const {deployContract, MockProvider, solidity} = require('ethereum-waffle')
const insurance = require('../build/Insurance.json');
const membership = require('../build/Membership.json');

use(solidity)

describe('Membership Contract', () => {
    const [contractDeloyer, admin, wallet1, wallet2] = new MockProvider().getWallets();
    var insuranceContract;
    var membershipContract;

    const customGasOptions = { gasPrice: 1, gasLimit: 100000, value: 0 }

    beforeEach(async () => {
        const mockERC20 = await deployMockContract(contractDeloyer, IERC20.abi);
        insuranceContract = await deployContract(contractDeloyer, insurance, [mockERC20.address]);
        membershipContract = new ethers.Contract(insuranceContract.membership(), membership.abi, contractDeloyer)
    });

    it('Member cannot sign up another member', async () => {
        //connect non owner to the contract
        const connectedWallet1 = membershipContract.connect(wallet1)
        //check that number of members is 0, since the contract just started
        expect(await connectedWallet1.numberOfMembers()).to.equal(0)
        //non owner signs up itself, expects the transaction to revert.
        await expect(connectedWallet1.MemberSignUp(wallet1.address, 1, customGasOptions)).to.be.revertedWith('Ownable: caller is not the owner')
        // check that number of members is still 0
        expect(await connectedWallet1.numberOfMembers()).to.equal(0)
        // check that the non owner doesn't have a rank in the contract. 
        expect(await connectedWallet1.memberIsOfRank(wallet1.address)).to.equal(0)
    })

    it('Owner can change member rank', async () => {
        // check that number of members is 0, since the contract just started
        expect(await membershipContract.numberOfMembers()).to.equal(0)
        // admin signs up a user to be a member, rank captain. 
        await insuranceContract.AdminSignupMember(wallet1.address, 1)
        // check that number of members is 1
        expect(await membershipContract.numberOfMembers()).to.equal(1)
        // checks that the member rank in the blockchain is captain.
        expect(await membershipContract.memberIsOfRank(wallet1.address)).to.equal(1)
        // change the member rank to FO
        await insuranceContract.AdminChangeMemberRank(wallet1.address, 2)
        // check that the member change was reflected on the blockchain.
        expect(await membershipContract.memberIsOfRank(wallet1.address)).to.equal(2)
    })

    it('Owner can resign member', async () => {
        // check that number of members is 0, since the contract just started
        expect(await membershipContract.numberOfMembers()).to.equal(0)
        // admin signs up a user to be a member, rank captain. 
        await insuranceContract.AdminSignupMember(wallet1.address, 1)
        // admin signs up second user to be a member, rank captain. 
        await insuranceContract.AdminSignupMember(wallet2.address, 2)
        // resigning user 1 now.
        await insuranceContract.AdminResignMember(wallet1.address)
        // making sure there are only 1 member
        expect(await membershipContract.numberOfMembers()).to.equal(1)
        // removing user 1 again, transaction should be reverted since it doesn't exist
        await expect(insuranceContract.AdminResignMember(wallet1.address)).to.be.revertedWith('Member doesn\'t exist. Cannot resign as member.')
        // making sure there are only 1 member
        expect(await membershipContract.numberOfMembers()).to.equal(1)
    })

    it('Member cannot change their own rank', async () => {
        // admin signs up 2 members.
        await insuranceContract.AdminSignupMember(wallet1.address, 1)
        await insuranceContract.AdminSignupMember(wallet2.address, 1)
        // first user connects to the contract
        const connectedWallet1 = membershipContract.connect(wallet1)
        // user check number of members
        expect(await connectedWallet1.numberOfMembers()).to.be.equal(2)
        // first user tries to change his own rank and expects it to fail
        await expect(connectedWallet1.MemberChangeRank(wallet1.address, 2)).to.be.revertedWith('Ownable: caller is not the owner')
    })
    
    it('Member cannot change the rank of some other member', async () => { 
        // admin signs up 2 members.
        await insuranceContract.AdminSignupMember(wallet1.address, 1)
        await insuranceContract.AdminSignupMember(wallet2.address, 1)
        // first user connects to the contract
        const connectedWallet1 = membershipContract.connect(wallet1)
        // first user tries to change the rank of the second user, and it fails. 
        await expect(connectedWallet1.MemberChangeRank(wallet2.address, 2)).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('Adding and removing members does not screw up the array', async () => {
        // admin signs up 4 members
        await insuranceContract.AdminSignupMember(contractDeloyer.address, 1)
        await insuranceContract.AdminSignupMember(admin.address, 1)
        await insuranceContract.AdminSignupMember(wallet1.address, 1)
        await insuranceContract.AdminSignupMember(wallet2.address, 1)
        // checks that each of the address indexes are correct
        expect(await membershipContract.members(0)).to.be.equal(contractDeloyer.address)
        expect(await membershipContract.members(1)).to.be.equal(admin.address)
        expect(await membershipContract.members(2)).to.be.equal(wallet1.address)
        expect(await membershipContract.members(3)).to.be.equal(wallet2.address)
        // admin removes the second person
        await insuranceContract.AdminResignMember(admin.address)
        // checks that each of the address are still there.
        expect(await membershipContract.members(0)).to.be.equal(contractDeloyer.address)
        expect(await membershipContract.members(1)).to.be.equal(wallet2.address)
        expect(await membershipContract.members(2)).to.be.equal(wallet1.address)
        await expect(membershipContract.members(3)).to.be.revertedWith('')
        //admin removes the first person
        await insuranceContract.AdminResignMember(contractDeloyer.address)

        // checks that each of the address are still there.
        expect(await membershipContract.members(0)).to.be.equal(wallet1.address)
        expect(await membershipContract.members(1)).to.be.equal(wallet2.address)
        await expect(membershipContract.members(2)).to.be.revertedWith('')
        await expect(membershipContract.members(3)).to.be.revertedWith('')
    })
})