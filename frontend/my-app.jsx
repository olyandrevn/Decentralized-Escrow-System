import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// npm install ethers @metamask/providers

// Константы (замените на реальные значения вашего контракта)
const CONTRACT_ADDRESS = "0xe533e76d134eEA649Dc379F5e0B3d92Ee537feDa"; // Адрес вашего развернутого контракта
const CONTRACT_ABI = [
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "dealId",
          "type": "uint256"
        }
      ],
      "name": "DealCompleted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "dealId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "buyer",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "seller",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "DealCreated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "dealId",
          "type": "uint256"
        }
      ],
      "name": "DealRefunded",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "deals",
      "outputs": [
        {
          "internalType": "address",
          "name": "buyer",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "seller",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "internalType": "enum SimpleEscrow.State",
          "name": "state",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "nextDealId",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "seller",
          "type": "address"
        }
      ],
      "name": "createDeal",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "dealId",
          "type": "uint256"
        }
      ],
      "name": "completeDeal",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "dealId",
          "type": "uint256"
        }
      ],
      "name": "refundDeal",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];

function App() {
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
    
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const escrowContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    setContract(escrowContract);
    
    loadDeals(escrowContract);
  };

  // Загрузка сделок
  const loadDeals = async (contract) => {
    const dealCount = await contract.nextDealId();
    const dealsList = [];
    
    for (let i = 1; i < dealCount; i++) {
      const deal = await contract.deals(i);
      dealsList.push({
        id: i,
        buyer: deal.buyer,
        seller: deal.seller,
        amount: ethers.utils.formatEther(deal.amount),
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
        value: ethers.utils.parseEther(amount)
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