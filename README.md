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

```
ganache # run local network

truffle init # add network to JSON
truffle compile # compile contract
truffle migrate --network development # deploy contract

truffle test # test contract
```

## Create React App

```
npx create-react-app escrow
```

Then add frontend part to the ```App.js``` and start app

```
npm start
```
