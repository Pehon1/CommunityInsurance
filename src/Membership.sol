// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Insurance.sol";
import "./Ranks.sol";

contract Membership is Ownable {

    using SafeMath for uint256;

    Insurance public insurance;

    uint256 public numberOfMembers;
    mapping (address => Ranks) public memberIsOfRank;

    constructor(address _insuranceContract) {
        insurance = Insurance(_insuranceContract);
    }

    function MemberSignUp(address newMember, Ranks newMemberRank) public onlyOwner {
        require(uint(memberIsOfRank[newMember]) == 0, "Member already signed up. Cannot sign-up again.");
        memberIsOfRank[newMember] = newMemberRank;
        numberOfMembers = numberOfMembers.add(1);
    }

    function MemberChangeRank(address member, Ranks newRank) public onlyOwner {
        require(uint(memberIsOfRank[member]) != 0, "Member doesn't exist. Cannot change rank.");
        memberIsOfRank[member] = newRank;
    }

    function _memberChangeOwnRank(address member, Ranks newRank) private onlyMembers(member) {
        memberIsOfRank[member] = newRank;
    }

    modifier onlyMembers(address memberTest) {
         require(msg.sender == memberTest, "Only members can do this");
         _;
    }
}