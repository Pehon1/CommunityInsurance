const {expect, use} = require('chai');
const {Contract} = require('ethers');

const {deployContract, MockProvider, solidity} = require('ethereum-waffle')
const testContract = require('../build/Membership.json');

use(solidity)

describe('Membership Contract', () => {
    const [contractDeloyer, admin, wallet1, wallet2] = new MockProvider().getWallets();
    var deployedContract;

    beforeEach(async () => {
      deployedContract = await deployContract(contractDeloyer, testContract, [contractDeloyer.address]);
    });

    it('Member cannot sign up another member', async () => {
        // connect non owner to the contract
        const connectedWallet1 = deployedContract.connect(wallet1)
        // check that number of members is 0, since the contract just started
        expect(await connectedWallet1.numberOfMembers()).to.equal(0)
        // non owner signs up itself, expects the transaction to revert.
        await expect(connectedWallet1.MemberSignUp(wallet1.address, 1)).to.be.reverted
        // check that number of members is still 0
        expect(await connectedWallet1.numberOfMembers()).to.equal(0)
        // check that the non owner doesn't have a rank in the contract. 
        expect(await connectedWallet1.memberIsOfRank(wallet1.address)).to.equal(0)
    })

    it('Owner can change member rank', async () => {
        // check that number of members is 0, since the contract just started
        expect(await deployedContract.numberOfMembers()).to.equal(0)
        // admin signs up a user to be a member, rank captain. 
        await deployedContract.MemberSignUp(wallet1.address, 1)
        // check that number of members is 1
        expect(await deployedContract.numberOfMembers()).to.equal(1)
        // checks that the member rank in the blockchain is captain.
        expect(await deployedContract.memberIsOfRank(wallet1.address)).to.equal(1)
        // change the member rank to FO
        await deployedContract.MemberChangeRank(wallet1.address, 2)
        // check that the member change was reflected on the blockchain.
        expect(await deployedContract.memberIsOfRank(wallet1.address)).to.equal(2)
    })

    it('Member cannot change their own rank', async () => {
        // admin signs up 2 members.
        await deployedContract.MemberSignUp(wallet1.address, 1)
        await deployedContract.MemberSignUp(wallet2.address, 1)
        // first user connects to the contract
        const connectedWallet1 = deployedContract.connect(wallet1)
        // first user tries to change his own rank and expects it to fail
        await expect(connectedWallet1.MemberChangeRank(wallet1.address, 2)).to.be.reverted
    })
    
    it('Member cannot change the rank of some other member', async () => { 
        // admin signs up 2 members.
        await deployedContract.MemberSignUp(wallet1.address, 1)
        await deployedContract.MemberSignUp(wallet2.address, 1)
        // first user connects to the contract
        const connectedWallet1 = deployedContract.connect(wallet1)
        // first user tries to change the rank of the second user, and it fails. 
        await expect(connectedWallet1.MemberChangeRank(wallet2.address, 2)).to.be.reverted
    })
})