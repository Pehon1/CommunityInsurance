// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Insurance.sol";
import "./Ranks.sol";

contract Membership is Ownable {

    using SafeMath for uint256;

    Insurance public insurance;

    uint256 public numberOfMembers;
    mapping (address => Ranks) public memberIsOfRank;
    address[] public members;

    constructor(address _insuranceContract) {
        insurance = Insurance(_insuranceContract);
    }

    function Members() public view returns(address[] memory) {
        return members;
    }

    function MemberSignUp(address newMember, Ranks newMemberRank) public onlyOwner {
        require(uint(memberIsOfRank[newMember]) == 0, "Member already signed up. Cannot sign-up again.");
        memberIsOfRank[newMember] = newMemberRank;
        numberOfMembers = numberOfMembers.add(1);
        members.push(newMember);
    }

    function MemberChangeRank(address member, Ranks newRank) public onlyOwner {
        require(uint(memberIsOfRank[member]) != 0, "Member doesn't exist. Cannot change rank.");
        memberIsOfRank[member] = newRank;
    }

    function MemberResign(address member) public onlyOwner {
        require(uint(memberIsOfRank[member]) != 0, "Member doesn't exist. Cannot resign as member.");
        delete memberIsOfRank[member];
        numberOfMembers = numberOfMembers.sub(1);

        for (uint i = 0; i<members.length-1; i++){
            if (members[i] == member) {
                delete members[i];
                members[i] = members[members.length - 1];
                members.pop();
                break;
            }      
        }
    }
}