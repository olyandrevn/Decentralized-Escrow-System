import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useNavigate } from 'react-router-dom';

const CONTRACT_ADDRESS = "0xe78A0F7E598Cc8b0Bb87894B0F60dD2a88d6a8Ab";
const CONTRACT_ABI = [
  "function deals(uint256) public view returns (address buyer, address seller, uint256 amount, uint256 buyerProductId, uint256 sellerProductId, uint8 state, bool deliveryConfirmed)",
  "function nextDealId() public view returns (uint256)",
  "function deposit(address seller, uint256 buyerProductId) external payable returns(uint256)",
  "function confirmReceipt(uint256 dealId) external",
  "function refund(uint256 dealId) external",
  "function confirmDelivery(uint256 dealId, uint256 sellerProductId) external",
  "function withdraw(uint256 dealId) external",
];

function BuyerPage() {
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [deals, setDeals] = useState([]);
  const [sellerAddress, setSellerAddress] = useState('');
  const [amount, setAmount] = useState('0.1');
  const [productId, setproductId] = useState('0');
  const navigate = useNavigate();

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask!');
      return;
    }

    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    setAccount(accounts[0]);
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner(accounts[0]);
    console.log("Buyer address:", await signer.getAddress());
    const escrowContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    setContract(escrowContract);
    await loadDeals(escrowContract);
  };

    const loadDeals = async (contract) => {
      const dealCount = Number(await contract.nextDealId());
      const dealsList = [];
      
      for (let i = 1; i < dealCount; i++) {
        const deal = await contract.deals(i);
        dealsList.push({
          id: i,
          buyer: deal.buyer.toLowerCase(),
          seller: deal.seller.toLowerCase(),
          amount: ethers.formatEther(deal.amount),
          state: ['DEPOSITED', 'DELIVERED', 'CONFIRMED', 'DECLINED', 'WITHDRAWN', 'REFUNDED'][Number(deal.state)],
          buyerProductId: deal.buyerProductId,
          sellerProductId: deal.sellerProductId,
        });
      }
      
      setDeals(dealsList);
    };

  // const loadDeals = async (contract) => {
  //   const dealCount = Number(await contract.nextDealId());
  //   const dealsList = [];
    
  //   for (let i = 1; i < dealCount; i++) {
  //     // Use array destructuring to properly get all return values
  //     const [buyer, seller, amount, buyerProductId, sellerProductId, state] = await contract.deals(i);
      
  //     console.log("Deal:", {
  //       id: i,
  //       buyerProductId: buyerProductId.toString(),
  //       state: ['DEPOSITED', 'DELIVERED', 'CONFIRMED', 'DECLINED', 'WITHDRAWN', 'REFUNDED'][Number(state)],
  //       rawState: state
  //     });

  //     dealsList.push({
  //       id: i,
  //       buyer: buyer.toLowerCase(),
  //       seller: seller.toLowerCase(),
  //       amount: ethers.formatEther(amount),
  //       state: ['DEPOSITED', 'DELIVERED', 'CONFIRMED', 'DECLINED', 'WITHDRAWN', 'REFUNDED'][Number(state)],
  //       buyerProductId: buyerProductId.toString(),
  //       sellerProductId: sellerProductId.toString()
  //     });
  //   }
    
  //   setDeals(dealsList);
  // };

  const updateDeals = async () => {
    if (!contract) return;
    
    try {
      await loadDeals(contract);
    } catch (error) {
      console.error("Error updating deals:", error);
    }
  };

  const createDeal = async () => {
    if (!contract) return;
    
    try {
      const tx = await contract.deposit(sellerAddress, ethers.toBigInt(productId), {
        value: ethers.parseEther(amount)
      });
      await tx.wait();
      await loadDeals(contract);
    } catch (error) {
      console.error("Error creating deal:", error);
    }
  };

  const completeDeal = async (dealId) => {
    if (!contract) return;
    
    try {
      const tx = await contract.confirmReceipt(dealId);
      await tx.wait();
      await loadDeals(contract);
    } catch (error) {
      console.error("Error completing deal:", error);
    }
  };

  const refundDeal = async (dealId) => {
    if (!contract) return;
    
    try {
      const tx = await contract.refund(dealId);
      await tx.wait();
      await loadDeals(contract);
    } catch (error) {
      console.error("Error refunding deal:", error);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Buyer Panel</h1>
      
      {!account ? (
        <button onClick={connectWallet}>Connect MetaMask</button>
      ) : (
        <div>
          <p>Connected: {account}</p>
          
          <div style={{ margin: '20px 0', padding: '20px', border: '1px solid #ccc' }}>
            <h3>Create New Deal</h3>
            <input 
              type="text" 
              placeholder="Seller Address" 
              value={sellerAddress}
              onChange={(e) => setSellerAddress(e.target.value)}
            />
            <input 
              type="text" 
              placeholder="Amount (ETH)" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <input 
              type="text" 
              placeholder="Product ID" 
              value={productId}
              onChange={(e) => setproductId(e.target.value)}
            />
            <button onClick={createDeal}>Create Deal</button>
          </div>

          <div style={{ margin: '20px 0', padding: '20px', border: '1px solid #ccc' }}>
            <button onClick={updateDeals}>Update Deals</button>
          </div>
          
          <div>
            <h3>Your Deals</h3>
            {deals.length === 0 ? (
              <p>No deals found</p>
            ) : (
              <ul>
                {deals.filter(deal => deal.buyer === account.toLowerCase()).map(deal => (
                  <li key={deal.id} style={{ margin: '10px 0', padding: '10px', border: '1px solid #eee' }}>
                    <p>ID: {deal.id}</p>
                    <p>Buyer: {deal.buyer}</p>
                    <p>Seller: {deal.seller}</p>
                    <p>Amount: {deal.amount} ETH</p>
                    <p>State: {deal.state}</p>
                    <p>Buy Product ID: {deal.buyerProductId}</p>
                    <p>Sell Product ID: {deal.sellerProductId}</p>
                    
                    {deal.state === 'DEPOSITED' && deal.buyer.toLowerCase() === account.toLowerCase() && (
                      <>
                        <button onClick={() => refundDeal(deal.id)}>Refund</button>
                      </>
                    )}

                    {deal.state === 'DELIVERED' && deal.buyer.toLowerCase() === account.toLowerCase() && (
                      <>
                        <button onClick={() => completeDeal(deal.id)}>Complete</button>
                        <button onClick={() => refundDeal(deal.id)}>Refund</button>
                      </>
                    )}
                    
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default BuyerPage;
