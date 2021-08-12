// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Insurance.sol";
import "./Membership.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./Ranks.sol";

contract Claims is Ownable {

    using SafeMath for uint256;

    struct ClaimEvent {
        address claimAddress;
        uint contributionEndBlock;
        uint256 contributionsSoFar;
        mapping(address => uint) contributions;
        bool openForContribution;
    }

    mapping (Ranks => uint256) public ranksToContributionMinimum;

    Insurance public insurance;
    Membership public membership;

    mapping (uint256 => ClaimEvent) public claimEvents;
    uint256 public numberOfClaimEvents;

    IERC20 public settlementToken;

    constructor(address _insuranceContract, address _membershipContract, address _settlementToken) {
        insurance = Insurance(_insuranceContract);
        membership = Membership(_membershipContract);
        settlementToken = IERC20(_settlementToken);
        ranksToContributionMinimum[Ranks.Captain] = 300;
        ranksToContributionMinimum[Ranks.FirstOfficer] = 200;
        ranksToContributionMinimum[Ranks.SecondOfficer] = 200;
    }

    function memberMinimumContributionAmount(address member) public view returns (uint256) {
        require(membership.memberIsOfRank(member) != Ranks(0), "Address not member");
        Ranks memberRank = membership.memberIsOfRank(member);
        return ranksToContributionMinimum[Ranks(memberRank)];
    }

    function contributeToClaim(uint256 claimId) public {
        require(membership.memberIsOfRank(_msgSender()) != Ranks(0), "Address not member");
        require(claimEvents[claimId].openForContribution, "Claim event has closed");
        settlementToken.transferFrom(_msgSender(), address(this), memberMinimumContributionAmount(_msgSender()));
        claimEvents[claimId].contributions[_msgSender()] = memberMinimumContributionAmount(_msgSender());
        claimEvents[claimId].contributionsSoFar = claimEvents[claimId].contributionsSoFar.add(memberMinimumContributionAmount(_msgSender()));
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

    function numberOfOpenClaimEvents() public view returns (uint256){
        uint256 hasOpenClaimEvent = 0;
        for (uint i = 0; i < numberOfClaimEvents; i++){
            if (claimEvents[i].openForContribution) {
                hasOpenClaimEvent = hasOpenClaimEvent.add(1);
            }      
        }
        return hasOpenClaimEvent;
    } 

    function setMinimumContributionAmountFor(Ranks rank, uint256 amount) public onlyOwner {
        require(rank != Ranks.None, "Cannot set amount for Rank - None");
        ranksToContributionMinimum[rank] = amount;
    }
}