# Установка зависимостей
brew install npm
brew install nvm # proper installation of Node Version Manager

nvm install 16
nvm use 16

npm init -y
npm install -g truffle ganache
npm install @openzeppelin/contracts

# Запуск локальной сети
ganache

# Компиляция и деплой
truffle init
truffle compile # add network to JSON
truffle migrate --network development

# Тестирование
truffle test