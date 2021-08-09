// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./Ranks.sol";

contract Insurance {

    using SafeMath for uint256;

    uint256 public numberOfMembers;
    mapping (address => Ranks) public memberIsOfRank;

    uint256 public numberOfAdmins;
    mapping (address => bool) public admin;

    constructor() {
        numberOfAdmins = 1;
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

    modifier MessageSenderMustBeAddress(address addressTest) {
        require(msg.sender == addressTest, "Address change must be message sender");
        _;
    }

    modifier AddressIsNotAdmin (address newAdmin) {
        require(admin[newAdmin] == false, "Address is admin");
        _;
    }

    modifier CannotBecomeZeroAdmin() {
        require(numberOfAdmins > 1, "Cannot proceed. Proceeding will result in 0 admin");
        _;
    }

    function AdminAdd(address newAdmin) public OnlyAdminCan AddressIsNotAdmin(newAdmin) {
        admin[newAdmin] = true;
        numberOfAdmins = numberOfAdmins.add(1);
    }

    function AdminResign(address adminAddress) public OnlyAdminCan CannotBecomeZeroAdmin {
        delete admin[adminAddress];
        numberOfAdmins = numberOfAdmins.sub(1);
    }

    function MemberSignUp(address newMember, Ranks newMemberRank) public  OnlyAdminCan AddressNotMember(newMember) {
        memberIsOfRank[newMember] = newMemberRank;
        numberOfMembers = numberOfMembers.add(1);
    }

    function MemberChangeRank(address member, Ranks newRank) public OnlyAdminOrMember AddressIsMember(member) {
        if (_msgSenderIsAdmin()) {
            memberIsOfRank[member] = newRank;
        } else {
            _memberChangeOwnRank(member, newRank);
        }
    }

    function _memberChangeOwnRank(address member, Ranks newRank) private MembersOnly MessageSenderMustBeAddress(member){
        memberIsOfRank[member] = newRank;
    }

    function _msgSenderIsAdmin() private view returns (bool){
        return admin[msg.sender];
    }
}