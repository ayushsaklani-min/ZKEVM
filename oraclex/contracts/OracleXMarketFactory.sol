// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { OracleXVault, IERC20 } from "./OracleXVault.sol";

/// @title OracleXMarketFactory
/// @notice Creates markets (as OracleXVault instances) and keeps registry.
contract OracleXMarketFactory {
    IERC20 public immutable usdc;
    address public immutable oracleAdapter;
    address public immutable verifier;
    address public owner;

    mapping(bytes32 => address) public marketIdToVault;
    mapping(address => bytes32) public vaultToMarketId;
    mapping(address => address) public marketToVault; // for API compatibility (market==vault)

    event MarketCreated(bytes32 indexed marketId, address indexed vault);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor(IERC20 _usdc, address _oracleAdapter, address _verifier) {
        usdc = _usdc;
        oracleAdapter = _oracleAdapter;
        verifier = _verifier;
        owner = msg.sender;
    }

    /// @notice Create a new market and its vault
    function createMarket(string calldata eventId, string calldata description, uint256 closeTimestamp) external returns (bytes32 marketId) {
        // marketId derived deterministically
        marketId = keccak256(abi.encodePacked(eventId, description, closeTimestamp, msg.sender, block.chainid));
        require(marketIdToVault[marketId] == address(0), "exists");

        // deploy vault
        OracleXVault vault = new OracleXVault(usdc, address(this), oracleAdapter, marketId, msg.sender);

        marketIdToVault[marketId] = address(vault);
        vaultToMarketId[address(vault)] = marketId;
        marketToVault[address(vault)] = address(vault); // compatibility

        emit MarketCreated(marketId, address(vault));
    }

    /// @notice For API compatibility; market address maps to its vault (vault itself here)
    function getVault(address market) external view returns (address) {
        return marketToVault[market];
    }
}
