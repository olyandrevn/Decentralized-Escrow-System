const { expectRevert } = require('@openzeppelin/test-helpers');
const { assert } = require('chai'); 

const Escrow = artifacts.require("Escrow");

contract("Escrow", (accounts) => {
  const [owner, buyer, seller, otherAccount] = accounts;
  let escrow;
  const buyerProductId = 123;
  const sellerProductId = 456;
  const amount = web3.utils.toWei("1", "ether");

  beforeEach(async () => {
    escrow = await Escrow.new();
  });

  describe("Deposit", () => {
    it("should create a new deal with correct parameters", async () => {
      const tx = await escrow.deposit(seller, buyerProductId, { from: buyer, value: amount });
      
      // Check event emission
      assert.equal(tx.logs[0].event, "Deposit");
      assert.equal(tx.logs[0].args.dealId.toString(), "1");
      assert.equal(tx.logs[0].args.buyer, buyer);
      assert.equal(tx.logs[0].args.seller, seller);
      assert.equal(tx.logs[0].args.amount.toString(), amount);
      assert.equal(tx.logs[0].args.productId.toString(), buyerProductId.toString());

      // Check deal storage
      const deal = await escrow.deals(1);
      assert.equal(deal.buyer, buyer);
      assert.equal(deal.seller, seller);
      assert.equal(deal.amount.toString(), amount);
      assert.equal(deal.buyerProductId.toString(), buyerProductId.toString());
      assert.equal(deal.state, "0"); // DEPOSITED
    });

    it("should reject zero amount deposits", async () => {
      await expectRevert(
        escrow.deposit(seller, buyerProductId, { from: buyer, value: 0 }),
        "Amount must be > 0"
      );
    });

    it("should reject zero product ID", async () => {
      await expectRevert(
        escrow.deposit(seller, 0, { from: buyer, value: amount }),
        "Product ID must be > 0"
      );
    });

    it("should reject when buyer is seller", async () => {
      await expectRevert(
        escrow.deposit(buyer, buyerProductId, { from: buyer, value: amount }),
        "Seller cannot be buyer"
      );
    });
  });

  describe("Confirm Delivery", () => {
    let dealId;

    beforeEach(async () => {
      await escrow.deposit(seller, buyerProductId, { from: buyer, value: amount });
      dealId = 1;
    });

    it("should allow seller to confirm delivery", async () => {
      const tx = await escrow.confirmDelivery(dealId, sellerProductId, { from: seller });
      
      // Check event emission
      assert.equal(tx.logs[0].event, "Delivery");
      assert.equal(tx.logs[0].args.dealId.toString(), dealId.toString());
      assert.equal(tx.logs[0].args.productId.toString(), sellerProductId.toString());

      // Check deal storage
      const deal = await escrow.deals(dealId);
      assert.equal(deal.state, "1"); // DELIVERED
      assert.equal(deal.sellerProductId.toString(), sellerProductId.toString());
    });

    it("should reject when not seller", async () => {
      await expectRevert(
        escrow.confirmDelivery(dealId, sellerProductId, { from: buyer }),
        "Only seller can call this"
      );
    });

    it("should reject when not in DEPOSITED state", async () => {
      // First confirm delivery to change state
      await escrow.confirmDelivery(dealId, sellerProductId, { from: seller });
      
      await expectRevert(
        escrow.confirmDelivery(dealId, sellerProductId, { from: seller }),
        "Invalid deal state"
      );
    });

    it("should reject zero product ID", async () => {
      await expectRevert(
        escrow.confirmDelivery(dealId, 0, { from: seller }),
        "Product ID must be > 0"
      );
    });
  });

  describe("Confirm Receipt", () => {
    let dealId;

    beforeEach(async () => {
      await escrow.deposit(seller, buyerProductId, { from: buyer, value: amount });
      dealId = 1;
      await escrow.confirmDelivery(dealId, buyerProductId, { from: seller }); // Matching IDs
    });

    it("should confirm receipt when product IDs match", async () => {
      const tx = await escrow.confirmReceipt(dealId, { from: buyer });
      
      // Check event emission
      assert.equal(tx.logs[0].event, "Confirmation");
      assert.equal(tx.logs[0].args.dealId.toString(), dealId.toString());

      // Check deal storage
      const deal = await escrow.deals(dealId);
      assert.equal(deal.state, "2"); // CONFIRMED
      assert.equal(deal.deliveryConfirmed, true);
    });

    it("should decline when product IDs don't match", async () => {
      // Create new deal with mismatched IDs
      await escrow.deposit(seller, 999, { from: buyer, value: amount });
      const newDealId = 2;
      await escrow.confirmDelivery(newDealId, sellerProductId, { from: seller });
      
      const tx = await escrow.confirmReceipt(newDealId, { from: buyer });
      
      // Check event emission
      assert.equal(tx.logs[0].event, "Refund");
      assert.equal(tx.logs[0].args.dealId.toString(), newDealId.toString());

      // Check deal storage
      const deal = await escrow.deals(newDealId);
      assert.equal(deal.state, "4"); // REFUNDED
    });

    it("should reject when not buyer", async () => {
      await expectRevert(
        escrow.confirmReceipt(dealId, { from: seller }),
        "Only buyer can call this"
      );
    });

    it("should reject when not in DELIVERED state", async () => {
      // Create new deal that's not delivered
      await escrow.deposit(seller, 456, { from: buyer, value: amount });
      const newDealId = 2;
      
      await expectRevert(
        escrow.confirmReceipt(newDealId, { from: buyer }),
        "Invalid deal state"
      );
    });
  });

  describe("Withdraw", () => {
    let dealId;

    beforeEach(async () => {
      await escrow.deposit(seller, buyerProductId, { from: buyer, value: amount });
      dealId = 1;
      await escrow.confirmDelivery(dealId, buyerProductId, { from: seller });
      await escrow.confirmReceipt(dealId, { from: buyer });
    });

    it("should allow seller to withdraw funds", async () => {
      const initialBalance = web3.utils.toBN(await web3.eth.getBalance(seller));
      
      const tx = await escrow.withdraw(dealId, { from: seller });
      const receipt = await web3.eth.getTransactionReceipt(tx.tx);
      const gasUsed = web3.utils.toBN(receipt.gasUsed);
      const gasPrice = web3.utils.toBN(tx.receipt.effectiveGasPrice);
      const txCost = gasUsed.mul(gasPrice);
      
      const finalBalance = web3.utils.toBN(await web3.eth.getBalance(seller));
      
      assert.equal(
        finalBalance.toString(),
        initialBalance.add(web3.utils.toBN(amount)).sub(txCost).toString()
      );
      
    //   // Check event emission
    //   assert.equal(tx.logs[0].event, "Withdrawal");
    //   assert.equal(tx.logs[0].args.dealId.toString(), dealId.toString());
    //   assert.equal(tx.logs[0].args.amount.toString(), amount);

    //   // Check deal storage
    //   const deal = await escrow.deals(dealId);
    //   assert.equal(deal.state, "3"); // WITHDRAWN
    //   assert.equal(deal.amount.toString(), "0");
    });

    it("should reject when not seller", async () => {
      await expectRevert(
        escrow.withdraw(dealId, { from: buyer }),
        "Only seller can call this"
      );
    });

    it("should reject when not in CONFIRMED state", async () => {
      // Create new deal that's not confirmed
      await escrow.deposit(seller, 456, { from: buyer, value: amount });
      const newDealId = 2;
      
      await expectRevert(
        escrow.withdraw(newDealId, { from: seller }),
        "Invalid deal state"
      );
    });
  });

  describe("Refund", () => {
    let dealId;

    beforeEach(async () => {
      await escrow.deposit(seller, buyerProductId, { from: buyer, value: amount });
      dealId = 1;
    });

    it("should allow refund in DEPOSITED state", async () => {
      const initialBalance = web3.utils.toBN(await web3.eth.getBalance(buyer));
      
      const tx = await escrow.refund(dealId, { from: buyer });
      const receipt = await web3.eth.getTransactionReceipt(tx.tx);
      const gasUsed = web3.utils.toBN(receipt.gasUsed);
      const gasPrice = web3.utils.toBN(tx.receipt.effectiveGasPrice);
      const txCost = gasUsed.mul(gasPrice);
      
      const finalBalance = web3.utils.toBN(await web3.eth.getBalance(buyer));
      
      assert.equal(
        finalBalance.toString(),
        initialBalance.add(web3.utils.toBN(amount)).sub(txCost).toString()
      );
      
      // Check event emission
      assert.equal(tx.logs[0].event, "Refund");
      assert.equal(tx.logs[0].args.dealId.toString(), dealId.toString());
      assert.equal(tx.logs[0].args.amount.toString(), amount);

      // Check deal storage
      const deal = await escrow.deals(dealId);
      assert.equal(deal.state, "4"); // REFUNDED
      assert.equal(deal.amount.toString(), "0");
    });

    it("should allow refund in DELIVERED but not confirmed state", async () => {
      await escrow.confirmDelivery(dealId, sellerProductId, { from: seller });
      
      const initialBalance = web3.utils.toBN(await web3.eth.getBalance(buyer));
      await escrow.refund(dealId, { from: buyer });
      const finalBalance = web3.utils.toBN(await web3.eth.getBalance(buyer));
      
      assert.isTrue(finalBalance.gt(initialBalance));
      
      const deal = await escrow.deals(dealId);
      assert.equal(deal.state, "4"); // REFUNDED
    });

    it("should reject when not buyer", async () => {
      await expectRevert(
        escrow.refund(dealId, { from: seller }),
        "Only buyer can call this"
      );
    });

    it("should reject in invalid states", async () => {
      // CONFIRMED state
      await escrow.confirmDelivery(dealId, buyerProductId, { from: seller });
      await escrow.confirmReceipt(dealId, { from: buyer });
      
      await expectRevert(
        escrow.refund(dealId, { from: buyer }),
        "Invalid state for refund"
      );
      
      // WITHDRAWN state
      await escrow.withdraw(dealId, { from: seller });
      await expectRevert(
        escrow.refund(dealId, { from: buyer }),
        "Invalid state for refund"
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle multiple deals correctly", async () => {
      // Create first deal
      await escrow.deposit(seller, 111, { from: buyer, value: amount });
      // Create second deal
      await escrow.deposit(seller, 222, { from: buyer, value: amount });
      
      const deal1 = await escrow.deals(1);
      const deal2 = await escrow.deals(2);
      
      assert.equal(deal1.buyerProductId.toString(), "111");
      assert.equal(deal2.buyerProductId.toString(), "222");
      assert.equal(deal1.state, "0"); // DEPOSITED
      assert.equal(deal2.state, "0"); // DEPOSITED
    });

    it("should correctly track deal states through full lifecycle", async () => {
      // DEPOSITED
      await escrow.deposit(seller, buyerProductId, { from: buyer, value: amount });
      let deal = await escrow.deals(1);
      assert.equal(deal.state, "0"); // DEPOSITED
      
      // DELIVERED
      await escrow.confirmDelivery(1, buyerProductId, { from: seller });
      deal = await escrow.deals(1);
      assert.equal(deal.state, "1"); // DELIVERED
      
      // CONFIRMED
      await escrow.confirmReceipt(1, { from: buyer });
      deal = await escrow.deals(1);
      assert.equal(deal.state, "2"); // CONFIRMED
      
      // WITHDRAWN
      await escrow.withdraw(1, { from: seller });
      deal = await escrow.deals(1);
      assert.equal(deal.state, "3"); // WITHDRAWN
    });
  });
});