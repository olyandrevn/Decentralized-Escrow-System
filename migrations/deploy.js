const SimpleEscrow = artifacts.require("SimpleEscrow");

module.exports = function(deployer) {
    deployer.deploy(SimpleEscrow);
};