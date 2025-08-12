pragma solidity ^0.8.19;

contract SimpleEscrow {
    enum State { CREATED, FUNDED, COMPLETED, REFUNDED }
    
    struct Deal {
        address buyer;
        address seller;
        uint256 amount;
        State state;
    }
    
    mapping(uint256 => Deal) public deals;
    uint256 public nextDealId = 1;
    
    event DealCreated(uint256 dealId, address buyer, address seller, uint256 amount);
    event DealCompleted(uint256 dealId);
    event DealRefunded(uint256 dealId);
    
    function createDeal(address seller) external payable returns(uint256) {
        require(msg.value > 0, "Amount must be > 0");
        require(seller != msg.sender, "Seller != buyer");
        
        uint256 dealId = nextDealId++;
        deals[dealId] = Deal(msg.sender, seller, msg.value, State.FUNDED);
        
        emit DealCreated(dealId, msg.sender, seller, msg.value);
        return dealId;
    }
    
    function completeDeal(uint256 dealId) external {
        Deal storage deal = deals[dealId];
        require(deal.buyer == msg.sender, "Only buyer can complete");
        require(deal.state == State.FUNDED, "Wrong state");
        
        deal.state = State.COMPLETED;
        payable(deal.seller).transfer(deal.amount);
        
        emit DealCompleted(dealId);
    }
    
    function refundDeal(uint256 dealId) external {
        Deal storage deal = deals[dealId];
        require(deal.buyer == msg.sender, "Only buyer can refund");
        require(deal.state == State.FUNDED, "Wrong state");
        
        deal.state = State.REFUNDED;
        payable(deal.buyer).transfer(deal.amount);
        
        emit DealRefunded(dealId);
    }
}