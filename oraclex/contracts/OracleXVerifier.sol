// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title OracleXVerifier
/// @notice Stores AI commitment hashes for markets. Future hook for zkML proofs.
contract OracleXVerifier {
    /// @dev MarketId => aiHash commitment
    mapping(bytes32 => bytes32) private marketCommitment;
    /// @dev Optional IPFS CID storage for human-readable explanation blob
    mapping(bytes32 => string) private marketCid;

    event AICommitted(bytes32 indexed marketId, bytes32 indexed aiHash, string ipfsCidOptional);

    /// @notice Commit a hash produced by deterministic AI proxy
    /// @param marketId The market identifier
    /// @param aiHash The keccak256 commitment of AI output
    /// @param ipfsCidOptional Optional IPFS CID with explanation payload
    function commitAI(bytes32 marketId, bytes32 aiHash, string calldata ipfsCidOptional) external {
        marketCommitment[marketId] = aiHash;
        if (bytes(ipfsCidOptional).length > 0) {
            marketCid[marketId] = ipfsCidOptional;
        }
        emit AICommitted(marketId, aiHash, ipfsCidOptional);
    }

    /// @notice Retrieve commitment for a market
    function getCommitment(bytes32 marketId) external view returns (bytes32) {
        return marketCommitment[marketId];
    }

    /// @notice Retrieve optional IPFS CID for a market
    function getCid(bytes32 marketId) external view returns (string memory) {
        return marketCid[marketId];
    }
}
