const SimpleEscrow = artifacts.require("SimpleEscrow");

module.exports = function(deployer) {
    deployer.deploy(SimpleEscrow);
};

const Escrow = artifacts.require("Escrow");

module.exports = function(deployer) {
    deployer.deploy(Escrow);
};