// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IOracleAdapter {
    function pushOutcome(bytes32 marketId, uint8 winningSide) external;
}

/// @title MockChainlinkOracle
/// @notice Simple test harness: backend calls this; it forwards to adapter.
contract MockChainlinkOracle {
    address public adapter;
    address public owner;

    event OutcomePosted(bytes32 indexed marketId, uint8 indexed winningSide);
    event AdapterUpdated(address indexed adapter);

    modifier onlyOwner() { require(msg.sender == owner, "not owner"); _; }

    constructor(address _adapter) {
        adapter = _adapter;
        owner = msg.sender;
        emit AdapterUpdated(_adapter);
    }

    function setAdapter(address _adapter) external onlyOwner {
        adapter = _adapter;
        emit AdapterUpdated(_adapter);
    }

    function postOutcome(bytes32 marketId, uint8 winningSide) external {
        emit OutcomePosted(marketId, winningSide);
        IOracleAdapter(adapter).pushOutcome(marketId, winningSide);
    }
}
