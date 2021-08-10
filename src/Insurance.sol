// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./Ranks.sol";
import "./Claims.sol";
import "./Membership.sol";

contract Insurance {

    using SafeMath for uint256;

    Claims public claims;
    Membership public membership;

    bool public membershipFreeze;

    uint256 public numberOfAdmins;
    mapping (address => bool) public admin;

    constructor(address settlementToken) {
        numberOfAdmins = 1;
        admin[msg.sender] = true;
        membership = new Membership(address(this));
        claims = new Claims(address(this), address(membership), settlementToken);
    }

    function SetFreezeOnMemberChange(bool to) public OnlyAdminCan {
        membershipFreeze = to;
    }

    function AdminCloseClaimEvent(uint256 claimId) public OnlyAdminCan {
        claims.closeClaimEvent(claimId);
        SetFreezeOnMemberChange(false);
    }

    function AdminTriggerClaimEvent(address claimAddress) public OnlyAdminCan {
        claims.triggerClaimEvent(claimAddress);
        SetFreezeOnMemberChange(true);
    }

    function AdminAdd(address newAdmin) public OnlyAdminCan {
        require(admin[newAdmin] == false, "Address is already admin. Cannot add");
        admin[newAdmin] = true;
        numberOfAdmins = numberOfAdmins.add(1);
    }

    function AdminResign(address adminAddress) public OnlyAdminCan {
        require(numberOfAdmins > 1, "Cannot proceed. Proceeding will result in 0 admin");
        delete admin[adminAddress];
        numberOfAdmins = numberOfAdmins.sub(1);
    }

    function AdminSignupMember(address newMember, Ranks newMemberRank) public OnlyAdminCan OnlyIfUnFrozen {
        membership.MemberSignUp(newMember, newMemberRank);
    }

    function AdminChangeMemberRank(address member, Ranks newRank) public OnlyAdminCan OnlyIfUnFrozen {
        membership.MemberChangeRank(member, newRank);
    }

    function AdminResignMember(address member) public OnlyAdminCan OnlyIfUnFrozen {
        membership.MemberResign(member);
    }

    function readMemberLength() public view returns (uint256) {
        return membership.numberOfMembers();
    }

    function readMemberIsOfRank(address member) public view returns (Ranks) {
        return membership.memberIsOfRank(member);
    }

    function _msgSenderIsAdmin() private view returns (bool){
        return admin[msg.sender];
    }

    modifier OnlyAdminCan() {
        require(_msgSenderIsAdmin(), "Only admin can do this");
        _;
    }

    modifier OnlyIfUnFrozen() {
        require(membershipFreeze == false, "Membership freeze is in effect");
        _;
    }
}