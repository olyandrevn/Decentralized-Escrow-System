pragma solidity ^0.8.19;
/*
Architecture
    buyer->>contract: deposit() 
    if successful delivery
        seller->>contract: confirmDelivery()
        buyer->>contract: confirmReceipt()
        seller->>contract: withdraw()
    else UNsuccessful delivery
        buyer->>contract: refund()
    end
*/

contract Escrow {
    enum DealState { DEPOSITED, DELIVERED, CONFIRMED, DECLINED, WITHDRAWN, REFUNDED }
    
    struct Deal {
        address buyer;
        address seller;
        uint256 amount;
        uint256 buyerProductId;
        uint256 sellerProductId;
        DealState state;
        bool deliveryConfirmed;
    }

    mapping(uint256 => Deal) public deals;
    uint256 public nextDealId = 1;
    
    // Модификаторы
    modifier onlySeller(uint256 dealId) {
        require(msg.sender == deals[dealId].seller, "Only seller can call this");
        _;
    }

    modifier onlyBuyer(uint256 dealId) {
        require(msg.sender == deals[dealId].buyer, "Only buyer can call this");
        _;
    }

    modifier inState(uint256 dealId, DealState expectedState) {
        require(deals[dealId].state == expectedState, "Invalid deal state");
        _;
    }

    // События
    event Deposit(uint256 indexed dealId, address buyer, address seller, uint256 amount, uint256 productId);
    event Delivery(uint256 indexed dealId, uint256 productId);
    event Confirmation(uint256 indexed dealId);
    event Decline(uint256 indexed dealId, string reason);
    event Withdrawal(uint256 indexed dealId, uint256 amount);
    event Refund(uint256 indexed dealId, uint256 amount);

    // Покупатель создает сделку
    function deposit(address seller, uint256 buyerProductId) external payable returns(uint256) {
        require(msg.value > 0, "Amount must be > 0");
        require(buyerProductId > 0, "Product ID must be > 0");
        require(seller != msg.sender, "Seller cannot be buyer");
        
        uint256 dealId = nextDealId++;
        deals[dealId] = Deal({
            buyer: msg.sender,
            seller: seller,
            amount: msg.value,
            buyerProductId: buyerProductId,
            sellerProductId: 0,
            state: DealState.DEPOSITED,
            deliveryConfirmed: false
        });
        
        emit Deposit(dealId, msg.sender, seller, msg.value, buyerProductId);
        return dealId;
    }

    // Продавец подтверждает доставку
    function confirmDelivery(uint256 dealId, uint256 sellerProductId) 
        external 
        onlySeller(dealId)
        inState(dealId, DealState.DEPOSITED)
    {
        require(sellerProductId > 0, "Product ID must be > 0");
        
        deals[dealId].state = DealState.DELIVERED;
        deals[dealId].sellerProductId = sellerProductId;
        emit Delivery(dealId, sellerProductId);
    }

    // Покупатель подтверждает получение
    function confirmReceipt(uint256 dealId) 
        external 
        onlyBuyer(dealId)
        inState(dealId, DealState.DELIVERED)
    {
        if (deals[dealId].buyerProductId == deals[dealId].sellerProductId) {
            deals[dealId].deliveryConfirmed = true;
            deals[dealId].state = DealState.CONFIRMED;
            emit Confirmation(dealId);
        } else {
            deals[dealId].state = DealState.DECLINED;
            uint256 amount = deals[dealId].amount;
            deals[dealId].amount = 0;
            deals[dealId].state = DealState.REFUNDED;
            
            payable(msg.sender).transfer(amount);
            emit Decline(dealId, "Product mismatch");
        }
    }

    // Продавец выводит средства
    function withdraw(uint256 dealId) 
        external 
        onlySeller(dealId)
        inState(dealId, DealState.CONFIRMED)
    {
        uint256 amount = deals[dealId].amount;
        deals[dealId].amount = 0;
        deals[dealId].state = DealState.WITHDRAWN;
        
        payable(msg.sender).transfer(amount);
        emit Withdrawal(dealId, amount);
    }

    // Покупатель запрашивает возврат
    function refund(uint256 dealId) 
        external 
        onlyBuyer(dealId)
    {
        Deal storage deal = deals[dealId];
        require(
            deal.state == DealState.DEPOSITED || 
            deal.state == DealState.DECLINED || 
            (deal.state == DealState.DELIVERED && !deal.deliveryConfirmed),
            "Invalid state for refund"
        );
        
        uint256 amount = deal.amount;
        deal.amount = 0;
        deal.state = DealState.REFUNDED;
        
        payable(msg.sender).transfer(amount);
        emit Refund(dealId, amount);
    }

    // Вспомогательная функция для проверки состояния
    function getDealState(uint256 dealId) public view returns (DealState) {
        return deals[dealId].state;
    }
}