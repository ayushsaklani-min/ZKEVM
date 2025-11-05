// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import { OracleXVault } from "../contracts/OracleXVault.sol";
import { OracleXMarketFactory } from "../contracts/OracleXMarketFactory.sol";
import { OracleXOracleAdapter } from "../contracts/OracleXOracleAdapter.sol";
import { OracleXVerifier } from "../contracts/OracleXVerifier.sol";
import { MockUSDC } from "../contracts/mocks/MockUSDC.sol";

contract OracleXVaultTest is Test {
    MockUSDC usdc;
    OracleXOracleAdapter adapter;
    OracleXMarketFactory factory;

    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    function setUp() public {
        usdc = new MockUSDC();
        adapter = new OracleXOracleAdapter(address(0));
        OracleXVerifier verifier = new OracleXVerifier();
        factory = new OracleXMarketFactory(IERC20(address(usdc)), address(adapter), address(verifier));
        adapter.setFactory(address(factory));

        // fund users
        usdc.mint(alice, 1_000_000);
        usdc.mint(bob, 1_000_000);
    }

    function _deployMarket() internal returns (bytes32 marketId, address vault) {
        string memory eventId = "E";
        string memory description = "D";
        uint256 closeTs = block.timestamp + 1 days;
        marketId = keccak256(abi.encodePacked(eventId, description, closeTs, address(this), block.chainid));
        vm.prank(address(this));
        bytes memory data = abi.encodeWithSelector(factory.createMarket.selector, eventId, description, closeTs);
        (bool ok, bytes memory ret) = address(factory).call(data);
        require(ok);
        // read from mapping
        vault = factory.marketIdToVault(marketId);
    }

    function test_deposit_allocate_settle_withdraw() public {
        (bytes32 marketId, address vaultAddr) = _deployMarket();
        OracleXVault vault = OracleXVault(vaultAddr);

        // approvals
        vm.startPrank(alice);
        usdc.approve(vaultAddr, type(uint256).max);
        vault.deposit(1, 500_000); // YES
        vm.stopPrank();

        vm.startPrank(bob);
        usdc.approve(vaultAddr, type(uint256).max);
        vault.deposit(0, 500_000); // NO
        vm.stopPrank();

        // allocate (by factory)
        vm.prank(address(factory));
        vault.allocateLiquidity(600_000, 400_000);

        // settle YES wins via adapter
        vm.prank(address(adapter));
        vault.settle(1);

        // withdrawals
        vm.prank(alice);
        vault.withdraw(); // gets principal + share of NO pool

        vm.prank(bob);
        vm.expectRevert();
        vault.withdraw(); // losing side can't withdraw
    }
}

interface IERC20 {
    function approve(address spender, uint256 value) external returns (bool);
}
