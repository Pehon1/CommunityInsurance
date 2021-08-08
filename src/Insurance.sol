// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract Insurance {

    enum Ranks { Captain, FirstOfficer, SecondOfficer }

    mapping (address => Ranks) public memberIsOfRank;

    mapping (address => bool) public admin;

    constructor() {
        admin[msg.sender] = true;
    }

    modifier OnlyAdminCan() {
        require(_msgSenderIsAdmin(), "Only admin can do this");
        _;
    }

    modifier OnlyAdminOrMember() {
        require(_msgSenderIsAdmin() || uint(memberIsOfRank[msg.sender]) != 0, "Only admin or member can do this");
        _;
    }

    modifier MembersOnly() {
        require(uint(memberIsOfRank[msg.sender]) != 0, "Only members can do this");
        _;
    }

    modifier AddressNotMember(address newMember) {
        require(uint(memberIsOfRank[newMember]) == 0, "Address is a member. Function only for non members");
        _;
    }
    
    modifier AddressIsMember(address newMember) {
        require(uint(memberIsOfRank[newMember]) != 0, "Address is not a member. Function is members only");
        _;
    }

    modifier AddressIsAdmin (address addressTest) {
        require(admin[addressTest], "Address is not admin");
        _;
    }

    modifier AddressIsNotAdmin (address newAdmin) {
        require(admin[newAdmin] == false, "Address is admin");
        _;
    }


    function AdminAdd(address newAdmin) public OnlyAdminCan AddressIsNotAdmin(newAdmin) {
        admin[newAdmin] = true;
    }

    function AdminResign(address adminAddress) public OnlyAdminCan {
        delete admin[adminAddress];
    }

    function MemberSignUp(address newMember, Ranks newMemberRank) public  OnlyAdminCan AddressNotMember(newMember) {
        memberIsOfRank[newMember] = newMemberRank;
    }

    function MemberChangeRank(address member, Ranks newRank) public OnlyAdminOrMember AddressIsMember(member) {
        if (_msgSenderIsAdmin()) {
            memberIsOfRank[member] = newRank;
        } else {
            _memberChangeOwnRank(newRank);
        }
    }

    function _memberChangeOwnRank(Ranks newRank) private MembersOnly {
        memberIsOfRank[msg.sender] = newRank;
    }

    function _msgSenderIsAdmin() private view returns (bool){
        return admin[msg.sender];
    }
}