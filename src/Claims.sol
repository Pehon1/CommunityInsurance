// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Insurance.sol";
import "./Membership.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract Claims is Ownable {

    using SafeMath for uint256;

    struct ClaimEvent {
        address claimAddress;
        uint contributionEndBlock;
        uint256 contributionsSoFar;
        mapping(address => uint) contributions;
        bool openForContribution;
    }

    Insurance public insurance;
    Membership public membership;

    mapping (uint256 => ClaimEvent) public claimEvents;
    uint256 public numberOfClaimEvents;

    IERC20 public settlementToken;

    constructor(address _insuranceContract, address _membershipContract, address _settlementToken) {
        insurance = Insurance(_insuranceContract);
        membership = Membership(_membershipContract);
        settlementToken = IERC20(_settlementToken);
    }

    function contributeToClaim(uint256 claimId) public {
        require(membership.memberIsOfRank(msg.sender) != Ranks(0), "Address not member");
        require(claimEvents[claimId].openForContribution, "Claim event has closed");
        settlementToken.transferFrom(_msgSender(), address(this), 200);
        claimEvents[claimId].contributions[_msgSender()] = 200;
        claimEvents[claimId].contributionsSoFar = claimEvents[claimId].contributionsSoFar.add(200);
    }

    function contributionsToClaim(uint256 clainId, address contributor) public view returns (uint) {
        return claimEvents[clainId].contributions[contributor];
    }

    function closeClaimEvent(uint256 claimId) public onlyOwner {
        require(claimEvents[claimId].claimAddress != address(0), "Claim doesn't exist");
        require(claimEvents[claimId].openForContribution, "Claim event has closed");
        claimEvents[claimId].openForContribution = false;
        if(claimEvents[claimId].contributionsSoFar > 0) {
            settlementToken.transfer(claimEvents[claimId].claimAddress, claimEvents[claimId].contributionsSoFar);
        }
    }

    function triggerClaimEvent(address claimAddress) public onlyOwner {
        require(claimAddress != address(0), "Cannot do claim on zero address");
        require(membership.memberIsOfRank(claimAddress) != Ranks(0), "Address not member");
        
        claimEvents[numberOfClaimEvents].claimAddress = claimAddress;
        claimEvents[numberOfClaimEvents].contributionEndBlock = block.number + 6400;
        claimEvents[numberOfClaimEvents].contributionsSoFar = 0;
        claimEvents[numberOfClaimEvents].openForContribution = true;
        numberOfClaimEvents = numberOfClaimEvents.add(1);
    }

    
    
}