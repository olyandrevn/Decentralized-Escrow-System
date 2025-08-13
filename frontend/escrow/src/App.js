import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// npm install ethers @metamask/providers

// Константы (замените на реальные значения вашего контракта)
const CONTRACT_ADDRESS = "0xcC853c5Bc61e1d1793B5552eEbe2361246445E7F"; // Адрес вашего развернутого контракта
const CONTRACT_ABI = [
  "function deals(uint256) public view returns (address buyer, address seller, uint256 amount, uint8 state)",
  // "uint256 public nextDealId = 1",
  "function nextDealId() public view returns (uint256)",
  "function createDeal(address seller) external payable returns(uint256)",
  "function completeDeal(uint256 dealId) external",
  "function refundDeal(uint256 dealId) external",
  ];

function App() {
  console.log("TEST CONSOLE LOG - APP MOUNTED");
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [deals, setDeals] = useState([]);
  const [sellerAddress, setSellerAddress] = useState('');
  const [amount, setAmount] = useState('0.1');

  // Подключение к MetaMask
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask!');
      return;
    }

    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    setAccount(accounts[0]);
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const escrowContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    setContract(escrowContract);

    console.log("Contract Address:", CONTRACT_ADDRESS);

    const network = await provider.getNetwork();
    console.log("Network chainId:", network.chainId);
    
    const code = await provider.getCode(CONTRACT_ADDRESS);
    console.log("Code is:", code);

    await loadDeals(escrowContract);
  };

  // Загрузка сделок
  const loadDeals = async (contract) => {
    let dealCount = await contract.nextDealId();
    console.log("Next deal ID:", dealCount.toString());
    const dealsList = [];
    
    for (let i = 1; i < dealCount; i++) {
      let deal = await contract.deals(i);
      dealsList.push({
        id: i,
        buyer: deal.buyer,
        seller: deal.seller,
        amount: ethers.formatEther(deal.amount),
        state: ['CREATED', 'FUNDED', 'COMPLETED', 'REFUNDED'][deal.state]
      });
    }
    
    setDeals(dealsList);
  };

  // Создание сделки
  const createDeal = async () => {
    if (!contract) return;
    
    try {
      const tx = await contract.createDeal(sellerAddress, {
        value: ethers.parseEther(amount)
      });
      await tx.wait();
      loadDeals(contract);
    } catch (error) {
      console.error("Error creating deal:", error);
    }
  };

  // Завершение сделки
  const completeDeal = async (dealId) => {
    if (!contract) return;
    
    try {
      const tx = await contract.completeDeal(dealId);
      await tx.wait();
      loadDeals(contract);
    } catch (error) {
      console.error("Error completing deal:", error);
    }
  };

  // Возврат средств
  const refundDeal = async (dealId) => {
    if (!contract) return;
    
    try {
      const tx = await contract.refundDeal(dealId);
      await tx.wait();
      loadDeals(contract);
    } catch (error) {
      console.error("Error refunding deal:", error);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Escrow App</h1>
      
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
            <button onClick={createDeal}>Create Deal</button>
          </div>
          
          <div>
            <h3>Your Deals</h3>
            {deals.length === 0 ? (
              <p>No deals found</p>
            ) : (
              <ul>
                {deals.map(deal => (
                  <li key={deal.id} style={{ margin: '10px 0', padding: '10px', border: '1px solid #eee' }}>
                    <p>ID: {deal.id}</p>
                    <p>Buyer: {deal.buyer}</p>
                    <p>Seller: {deal.seller}</p>
                    <p>Amount: {deal.amount} ETH</p>
                    <p>State: {deal.state}</p>
                    
                    {deal.state === 'FUNDED' && deal.buyer === account && (
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

export default App;