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

function SellerPage() {
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [deals, setDeals] = useState([]);
  const [productIdInputs, setProductIdInputs] = useState({});
  const navigate = useNavigate();

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask!');
      return;
    }

    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    setAccount(accounts[1]);
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner(accounts[1]);
    console.log("Seller address:", await signer.getAddress());
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

  const updateDeals = async () => {
    if (!contract) return;
    
    try {
      await loadDeals(contract);
    } catch (error) {
      console.error("Error updating deals:", error);
    }
  };

  const confirmDeal = async (dealId, productId) => {
    if (!contract) return;
    
    try {
      console.log("Product ID:", productId);
      const tx = await contract.confirmDelivery(dealId, ethers.toBigInt(productId));
      await tx.wait();
      await loadDeals(contract);
    } catch (error) {
      console.error("Error creating deal:", error);
    }
  };

  const withdrawDeal = async (dealId) => {
    if (!contract) return;
    
    try {
      const tx = await contract.withdraw(dealId);
      await tx.wait();
      await loadDeals(contract);
    } catch (error) {
      console.error("Error completing deal:", error);
    }
  };

  // Update product ID input for a specific deal
  const handleProductIdChange = (dealId, value) => {
    setProductIdInputs(prev => ({
      ...prev,
      [dealId]: value
    }));
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Seller Panel</h1>
      
      {!account ? (
        <button onClick={connectWallet}>Connect MetaMask</button>
      ) : (
        <div>
          <p>Connected: {account}</p>

          <div style={{ margin: '20px 0', padding: '20px', border: '1px solid #ccc' }}>
            <button onClick={updateDeals}>Update Deals</button>
          </div>
          
          <div>
            <h3>Your Deals</h3>
            {deals.length === 0 ? (
              <p>No deals found</p>
            ) : (
              <ul>
                {deals.filter(deal => deal.seller === account.toLowerCase()).map(deal => (
                  <li key={deal.id} style={{ margin: '10px 0', padding: '10px', border: '1px solid #eee' }}>
                    <p>ID: {deal.id}</p>
                    <p>Buyer: {deal.buyer}</p>
                    <p>Seller: {deal.seller}</p>
                    <p>Amount: {deal.amount} ETH</p>
                    <p>State: {deal.state}</p>
                    <p>Buy Product ID: {deal.buyerProductId}</p>
                    <p>Sell Product ID: 
                      <input 
                        type="text" 
                        placeholder="Product ID" 
                        value={productIdInputs[deal.id] || deal.sellerProductId || ''}
                        onChange={(e) => handleProductIdChange(deal.id, e.target.value)}
                      />
                    </p>

                    {deal.state === 'DEPOSITED' && deal.seller.toLowerCase() === account.toLowerCase() && (
                      <button onClick={() => {
                      const productId = productIdInputs[deal.id] || deal.sellerProductId;
                      console.log("Product ID:", productId);
                      if (!productId) {
                        alert('Please enter a product ID');
                        return;
                      }

                      confirmDeal(deal.id, productId);
                    }}>
                      Confirm
                    </button>
                    )}

                    {deal.state === 'CONFIRMED' && deal.seller.toLowerCase() === account.toLowerCase() && (
                      <>
                        <button onClick={() => withdrawDeal(deal.id)}>Withdraw</button>
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

export default SellerPage;