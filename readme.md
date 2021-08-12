# Community Insurance

## Inspiration

Work on this project was inspired by the Pilot for Pilots and PCare, both community based insurance ([what is?](https://www.who.int/news-room/fact-sheets/detail/community-based-health-insurance-2020)) initiatives by the Pilot commumity in Singapore. On behalf of all members, we thank administrators for both initiatives for their contributions to the community. 

---

## Abstract

In general, here is how a pilot-run community based insurance programme would work.

- A group of pilots enter into an honour based contract, thereby binding them into the programme as members.
- Members in this commmunity pledge that whenever another memmbers (claimer) in the programme experiences a loss of licence event (a claim event), each member would contribute an agreed sum of money to which would be paid to the claimer. 
- Programmes like these are generally administered by a committee of pilots. This committee is tasked with the responsibility of tracking membership data, reviewing loss of licence event claims, disseminating such events, tracking fulfillment of pledges and the eventual claim payout. 

Administrators are generally volunteers, and do not receive any form of remumeration for their time in administering such programmes. While such programmes have been administered with high level of integrity, administering these programmes has become needlessly tiresome. Programmes like these should be adminstered with as little work as possible, especially since the administors are usually unpaid volunteers.

With the increased adoption of decentralised blockchain wallet, and the recent release of [XSGD](https://www.xfers.com/sg/straitsx#XSGDsection) (a SGD stablecoin), it is now possible to manage such programmes efficiently in a decentralised manner on the blockchain.

---

## Purpose

The purpose of this project is to serve as a proof-of-concept, to show that community based insurance programmes such as Pilot for Pilots and PCare can be administered more efficiently on the blockchain.

---

## Project Mamnagement

### Testnet

Contracts has been deployed to the Ropsten Testnet at the following addresses

Insurance contract 0x212561ff2d1b8653caf7eead69ce44810ea16be8
Claims contract 0x9c0F3d1ED8E593b75e2f2448Cf222BE6f6bc7f4a
Membership contract 0xA271Ac4Da8Eb7b0019C50Acb3F999aa4Ef7De804

### Immediate

- [x] Unit Tests (ongoing)
- [ ] Implement timestamps instead of using block number
- [ ] Documentation
- [ ] Time as member before a claim event can be triggered for this member
- [ ] Web3 frontend
- [ ] Add events to the contract
- [ ] Deployment onto testnet, using actual ERC20 test tokens
- [ ] Consider whether the contracts upgradable, and make it so.
- [ ] Peer review of contract
- [ ] Professional Review of contract

### Possible Improvements

#### DAO

The current implementations allows any nominated admins to trigger (or end) claim events. A possible alternative would implement a DAO type voting system before key events (such as triggering of claim events) must be voted on by members before such events can be triggered. 

#### NFT for membership tracking

Membership can be tracked using NFTs. Utilising ERC721's tokenId, admin can match NFT's tokenId to registered members. The advantage of using NFTs to track membership is that members are not tied to any single address. Should they choose, they can transfer the NFT over to a new wallet, thereby registering the new address as the new member's address. 

Implementing NFT for membership tracking would address the situation where any users loses control of their wallet. The ERC721 contract could potentially allow a DAO or Admin to force transfer the membership NFT without needing approval from a wallet. 

Member's details such as rank could also be tracked as meta data. Following the current consideration where only admin is allowed to change ranks of a member, a DAO or admin contract could make changes into an ERC721's metadata.

Also technical advantages aside, having an NFT could simply be a cool proof of membership in a unique fraternity. 

---

## A Walkthru

- The address deploying the contract would become the defecto **admin**. The master contract is Insurance.sol and deployment of that contract would result in the deployment of Membership and Claims contracts. 

- The settlement currency (or token), while designed to work with XSGD, is also compatible with any ERC20 tokens. Meaning, tokens such as DAI, USDC, WBTC could be used instead. The settlement currency is determined at launch, and the ERC20 contract address would need to be provided at deployment ([XSGD's address](https://etherscan.io/token/0x70e8de73ce538da2beed35d14187f6959a8eca96)). We could possibly implement a method to allow admin to change the ERC20 token. 

- Any one **admin** is able add or resign any other **admin**. However, there must always be at least 1 admin, and the contract would disallow the resignation of the last admin.

- **Admins** are the only ones that are allowed to Sign up a member, Resign a member, and to change the rank of a member. The idea here is the **admin** would need to maintain a database tying the pseudo anonymous address of a member with the member's real identification and contact information. Storage of such sensitive information on a public blockchain isn't ideal.

- **Admin** would also be allowed to change parameters such as the Minimum Contribution Amounts. At deployment, the minimum contribution amounts are Captain = 200, First Officer = 200 and Second Officer = 200.

- In practice, all claim events would be sent to the **admin** "off chain". Its up to the committe of **admins** to weigh on the legitimacy of the claim. **admin** would trigger a claim event, which would freeze all membership changes (add, resign or rank change). This freeze would also freeze all changes to Minimum Contribution Amounts.

- **Members** notified on a claim event would now proceed to contribute their share into the contract. Members would be required to make the contribution themselves, directly into the contract (through a Web3 interface, of course). The contract manage the accounting and ledger of all contributions.

- At the end of the claim event (presumably **admin** would have sent several reminders before we get here), **admin** would close the claim event, which would result in the dispensation of all contributions to the claimer. At this point, the membership freeze would stop, and **admin** would be free to sign members up, resign members or change members' rank.

---

## Off chain vs On chain

We've identified the following responsibilities for a committee administering such a programme, and how this contract can help with these responsibilities. 

1. Tracking membership data -> *partially offloaded to the contract*.
    - Members rank (Captain, First Officer or Second Officer) are stored on the blockchain. These ranks are tied to the pseudo anonymous addresses, which are matched to real person data off chain by admin. An off-chain admin dashboard could be built into the platform to assist admin in maintaining this database. This platform can allow users to sign a message using their Web3 wallet, fill up a form with contact details, thereby assisting admin in linking the address to a real person. Possible future implementation. 
1. Reviewing loss of licence event claims -> *not offloaded in current implementation*. 
    - It is however, possible to offload this process by allowing a DAO vote on such decisions.
1. Disseminating of claim events -> *not offloaded in current implementation*. 
    - Still requires admin to maintain a database of members and their contact details. However, with a Web3 interface, it is possible to have a script listen to event triggers which calls an API to send an email to an email-list. 
1. Tracking fulfillment of pledges -> *fully offloaded to the contract*. 
    - Members are responsible to make their contributions to the contract themselves, using their Web3 wallets. Since everything is on chain, anyone is able to check payment status of any other member, and the total contribution. 
1. Claim payout -> *fully offloaded to the contract*. 
    - Admin would simply call a method to close the claim event, which would automatically distribute claim payouts to the claimer directly. There is no need for admin to keep track of screenshots and/or receive and forward cheques. Everything is handled onchain. 

While the process of having a committee consider the legitimacy of a claim isn't any different from the current process, we can see that administration of the rest of the process has now been handed over to the contract, chiefly, the management of member's funds. 

---

## Contributions

Please feel free to contribute to this project. All contributions big or small, tech or non-tech are welcomed. Even this README requires contributions, and non-tech contributors can help out here =)

To contribute: 

1. [Fork](https://docs.github.com/en/get-started/quickstart/fork-a-repo) the project.
1. Make your changes. 
1. Send a [pull request](https://github.com/Pehon1/CommunityInsurance).
1. I'll review them. 

All contributors will be recognised in a Contributors section in this README file.

---

## Contributors

*WIP*

---

## Challenges

*WIP*

#### Not all pilots are savvy 

*WIP*

#### What happens when a pilot loses their private keys?

*WIP*

#### Not all pilots are able to procure XSGD

*WIP*

#### What if all admin lose their private keys?

*WIP*
