# Decentralized-Escrow-System

## Installation

```
brew install npm
brew install nvm # then proper installation of Node Version Manager

nvm install 18
nvm use 18

npm init -y
npm install -g truffle ganache
npm install @openzeppelin/contracts
```

## Compile and Deploy contract

You also have to use -d to determinalistic generate account addresses and -i to use the same network id.

```
ganache -d -i 123456 # run local network
```

```
truffle init # add network to JSON
truffle compile # compile contract
truffle migrate --network development # deploy contract
```
After deployment one can get the ```contract address``` and the ```ABI``` file will be generated in the ```build``` directory:

```
Compiling your contracts...
===========================
> Everything is up to date, there is nothing to compile.


Starting migrations...
======================
> Network name:    'development'
> Network id:      1755094076623
> Block gas limit: 30000000 (0x1c9c380)


2_deploy_contracts.js
=====================

   Deploying 'SimpleEscrow'
   ------------------------
   > transaction hash:    0x555b17bb8b965089256c8fd14361b9ba6266e01a8c0625c1744920358675b650
   > Blocks: 0            Seconds: 0
   > contract address:    0xcC853c5Bc61e1d1793B5552eEbe2361246445E7F
   > block number:        1
   > block timestamp:     1755094112
   > account:             0x298AC48bDf766a955480878fC8b887Bf91f81c7F
   > balance:             999.997394037625
   > gas used:            772137 (0xbc829)
   > gas price:           3.375 gwei
   > value sent:          0 ETH
   > total cost:          0.002605962375 ETH

   > Saving artifacts
   -------------------------------------
   > Total cost:      0.002605962375 ETH

Summary
=======
> Total deployments:   1
> Final cost:          0.002605962375 ETH
```

```
truffle test # test contract
```
## Create React App

```
npx create-react-app escrow
```

Then add frontend part to the ```App.js```.
Change those values to deployed ones:

```
const CONTRACT_ADDRESS = ""; 
const CONTRACT_ABI = [];
```
Start the app:

```
npm start
```
