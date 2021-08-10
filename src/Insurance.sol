// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./Ranks.sol";
import "./Membership.sol";

contract Insurance {

    using SafeMath for uint256;

    Membership public membership;

    uint256 public numberOfAdmins;
    mapping (address => bool) public admin;

    constructor() {
        numberOfAdmins = 1;
        admin[msg.sender] = true;
        membership = new Membership(address(this));
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

    function AdminSignupMember(address newMember, Ranks newMemberRank) public OnlyAdminCan {
        membership.MemberSignUp(newMember, newMemberRank);
    }

    function AdminChangeMemberRank(address member, Ranks newRank) public OnlyAdminCan {
        membership.MemberChangeRank(member, newRank);
    }

    function AdminResignMember(address member) public OnlyAdminCan {
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
}