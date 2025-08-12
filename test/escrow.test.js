const SimpleEscrow = artifacts.require("SimpleEscrow");

contract("SimpleEscrow", accounts => {
    let escrow;
    const [buyer, seller] = accounts;
    
    before(async () => {
        escrow = await SimpleEscrow.new();
    });

    it("should deploy successfully", async () => {
        assert(escrow, "Contract should be deployed");
        assert(escrow.address, "Contract should have address");
        
        const nextDealId = await escrow.nextDealId();
        assert.equal(nextDealId.toString(), "1");
    });
    
    it("should create deal", async () => {
        const amount = web3.utils.toWei("1", "ether");
        const result = await escrow.createDeal(seller, {from: buyer, value: amount});
        
        const deal = await escrow.deals(1);
        assert.equal(deal.buyer, buyer);
        assert.equal(deal.seller, seller);
    });
    
    it("should complete deal", async () => {
        const amount = web3.utils.toWei("1", "ether");
        await escrow.createDeal(seller, {from: buyer, value: amount});
        
        const balanceBefore = await web3.eth.getBalance(seller);
        await escrow.completeDeal(1, {from: buyer});
        const balanceAfter = await web3.eth.getBalance(seller);
        
        assert(parseInt(balanceAfter) > parseInt(balanceBefore));
    });
});