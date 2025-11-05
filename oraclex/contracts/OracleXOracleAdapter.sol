// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IOracleXFactory {
    function marketIdToVault(bytes32) external view returns (address);
}

interface ISettleVault {
    function settle(uint8 winningSide) external;
}

/// @title OracleXOracleAdapter
/// @notice Minimal adapter receiving final outcomes (mocked Chainlink) and settling vaults.
contract OracleXOracleAdapter {
    address public factory;
    address public owner;

    event OutcomePushed(bytes32 indexed marketId, uint8 indexed winningSide);
    event FactorySet(address indexed factory);

    modifier onlyOwner() { require(msg.sender == owner, "not owner"); _; }

    constructor(address _factory) {
        owner = msg.sender;
        factory = _factory;
        emit FactorySet(_factory);
    }

    function setFactory(address _factory) external onlyOwner {
        factory = _factory;
        emit FactorySet(_factory);
    }

    function pushOutcome(bytes32 marketId, uint8 winningSide) external {
        address vault = IOracleXFactory(factory).marketIdToVault(marketId);
        require(vault != address(0), "no vault");
        ISettleVault(vault).settle(winningSide);
        emit OutcomePushed(marketId, winningSide);
    }
}
