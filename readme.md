# Community Insurance

## Inspiration

Work on this project was inspired by the Pilot for Pilots and PCare, both community initiatives by Pilots in Singapore.

---

## Abstract

In general, here's how a pilot-run community insurance programme would work.

- A group of pilots enter into an honour based contract, thereby binding them into the programme.
- Pilots in this commmunity pledge that whenever another pilot in the programme experiences a loss of licence event (a claim event), each pilot would contribute an agreed amount of money to help the pilot. 
- Programmes like these are generally administered by a committee of pilots. This committee is tasked with the responsibility of tracking membership data, reviewing loss of licence event claims, disseminating such events, tracking fulfillment of pledges and the eventual claim payout. 

While such programmes have been administered with high level of integrity, administering these programmes has become needlessly tiresome. 

With the increased adoption of decentralised blockchain wallet, and the recent release of [XSGD](https://www.xfers.com/sg/straitsx#XSGDsection) (a SGD stablecoin), it is now possible to manage such programmes in a decentralised manner on the blockchain.

---

## Purpose

The purpose of this project is to serve as a proof-of-concept, to show that community insurance programmes such as Pilot for Pilots and PCare can be administered more efficiently on the blockchain.

---

## Project Todo

### Immediate

- [x] Unit Tests (ongoing)
- [ ] Documentation
- [ ] Time as member before a claim event can be triggered for this member
- [ ] Web3 frontend
- [ ] Add events to the contract
- [ ] Deployment onto testnet, using actual ERC20 test tokens
- [ ] Consider whether the contracts upgradable, and make it so.
- [ ] Peer review of contract
- [ ] Professional Review of contract

### Possible Improvements

- The current contract allows any nominated admins to trigger (or end) claim events. A possible implementation could result in a DAO vote on whether a claim event could be triggered. 

---

## A walkthru

- The address deploying the contract would become the defecto **admin**. The master contract is Insurance.sol and deployment of that contract would result in the deployment of Membership and Claims contracts. 

- The settlement currency (or token), while designed to work with XSGD, is also compatible with any ERC20 tokens. Meaning, tokens such as DAI, USDC, WBTC could be used instead. The settlement currency is determined at launch, and the ERC20 contract address would need to be provided at deployment ([XSGD's address](https://etherscan.io/token/0x70e8de73ce538da2beed35d14187f6959a8eca96)). We could possibly implement a method to allow admin to change the ERC20 token. 

- Any one **admin** is able add or resign any other **admin**. However, there must always be at least 1 admin, and the contract would disallow the resignation of the last admin.

- **admins** are the only ones that are allowed to Sign up a member, Resign a member, and to change the rank of a member. The idea here is the **admin** would need to maintain a database tying the pseudo anonymous address of a member with the member's real identification and contact information. Storage of such sensitive information on a public blockchain isn't ideal.

- **admin** would also be allowed to change parameters such as the Minimum Contribution Amounts. At deployment, the minimum contribution amounts are Captain = 200, First Officer = 200 and Second Officer = 200.

- In practice, all claim events would be sent to the **admin** "off chain". Its up to the committe of **admins** to weigh on the legitimacy of the claim. **admin** would trigger a claim event, which would freeze all membership changes (add, resign or rank change). This freeze would also freeze all changes to Minimum Contribution Amounts.

- **members** notified on a claim event would now proceed to contribute their share into the contract. Members would be required to make the contribution themselves, directly into the contract (through a Web3 interface, of course). The contract manage the accounting and ledger of all contributions.

- At the end of the claim event (presumably **admin** would have sent several reminders before we get here), **admin** would close the claim event, which would result in the dispensation of all contributions to the claimer. At this point, the membership freeze would stop, and **admin** would be free to sign members up, resign members or change members' rank.

---

## Off chain vs On chain

We've identified the following responsibilities for a committee administering such a programme, and how this contract can help with these responsibilities. 

1. tracking membership data -> *partially offloaded to the contract*.
    - Members rank (Captain, First Officer or Second Officer) are stored on the blockchain. These ranks are tied to the pseudo anonymous addresses, which are matched to real person data off chain by admin. An off-chain admin dashboard could be built into the platform to assist admin in maintaining this database. This platform can allow users to sign a message using their Web3 wallet, fill up a form with contact details, thereby assisting admin in linking the address to a real person. Possible future implementation. 
1. reviewing loss of licence event claims -> *not offloaded in current implementation*. 
    - It is however, possible to offload this process by allowing a DAO vote on such decisions.
1. disseminating of claim events -> *not offloaded in current implementation*. 
    - Still requires admin to maintain a database of members and their contact details. However, with a Web3 interface, it is possible to have a script listen to event triggers which calls an API to send an email to an email-list. 
1. tracking fulfillment of pledges -> *fully offloaded to the contract*. 
    - Members are responsible to make their contributions to the contract themselves, using their Web3 wallets. Since everything is on chain, anyone is able to check payment status of any other member, and the total contribution. 
1. the eventual claim payout -> *fully offloaded to the contract*. 
    - Admin would simply call a method to close the claim event, which would automatically distribute claim payouts to the claimer directly. There is no need for admin to keep track of screenshots and/or receive and forward cheques. Everything is handled onchain. 

While the process of having a committee consider the legitimacy of a claim isn't any different from the current process, we can see that administration of the rest of the process has now been handed over to the contract, chiefly, the management of member's funds. 

---

## Contributions

Please feel free to contribute to this project. 

1. Clone the project.
1. Make your changes. 
1. Send a pull request, and I'll review them. 

I'll add a Contributors section to this README once this project receives more contributions. 

---

## Challenges

#### Not all pilots are savvy 

#### What happens when a pilot loses their private keys?

#### Not all pilots are able to procure XSGD

#### What if all admin lose their private keys?

