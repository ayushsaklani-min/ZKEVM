// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal ERC20 interface
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function decimals() external view returns (uint8);
}

/// @title OracleXVault
/// @notice USDC vault managing YES/NO pools and post-settlement withdrawals.
contract OracleXVault {
    enum State { Open, Locked, Settled }

    IERC20 public immutable usdc;
    address public immutable factory;
    address public immutable oracleAdapter;
    address public owner;
    bytes32 public immutable marketId;

    State public state;
    uint8 public winningSide; // 0 = NO, 1 = YES

    uint256 public totalYes;
    uint256 public totalNo;

    mapping(address => uint256) public yesBalances;
    mapping(address => uint256) public noBalances;

    uint256 public allocatedYes;
    uint256 public allocatedNo;

    event Deposited(address indexed user, uint8 indexed side, uint256 amount);
    event Allocated(uint256 yesAmount, uint256 noAmount);
    event Settled(bytes32 indexed marketId, uint8 indexed winningSide);
    event Withdrawn(address indexed user, uint256 amount);
    event StateChanged(State from, State to);

    modifier onlyFactoryOrOwner() {
        require(msg.sender == factory || msg.sender == owner, "not auth");
        _;
    }

    modifier onlyOracleAdapter() {
        require(msg.sender == oracleAdapter, "not oracle");
        _;
    }

    constructor(
        IERC20 _usdc,
        address _factory,
        address _oracleAdapter,
        bytes32 _marketId,
        address _owner
    ) {
        usdc = _usdc;
        factory = _factory;
        oracleAdapter = _oracleAdapter;
        marketId = _marketId;
        owner = _owner;
        state = State.Open;
    }

    /// @notice Deposit USDC into YES(1) or NO(0) pool
    function deposit(uint8 side, uint256 amount) external {
        require(state == State.Open, "vault closed");
        require(side == 0 || side == 1, "bad side");
        require(amount > 0, "zero amt");

        require(usdc.transferFrom(msg.sender, address(this), amount), "xferFrom fail");

        if (side == 1) {
            yesBalances[msg.sender] += amount;
            totalYes += amount;
        } else {
            noBalances[msg.sender] += amount;
            totalNo += amount;
        }

        emit Deposited(msg.sender, side, amount);
    }

    /// @notice Operator allocation based on probability; first call locks vault.
    function allocateLiquidity(uint256 yesAmount, uint256 noAmount) external onlyFactoryOrOwner {
        require(state != State.Settled, "settled");
        allocatedYes = yesAmount;
        allocatedNo = noAmount;
        if (state == State.Open) {
            State prev = state;
            state = State.Locked;
            emit StateChanged(prev, state);
        }
        emit Allocated(yesAmount, noAmount);
    }

    /// @notice Settle market and enable withdrawals for winners.
    function settle(uint8 _winningSide) external onlyOracleAdapter {
        require(state != State.Settled, "already");
        require(_winningSide == 0 || _winningSide == 1, "bad side");
        winningSide = _winningSide;
        State prev = state;
        state = State.Settled;
        emit StateChanged(prev, state);
        emit Settled(marketId, _winningSide);
    }

    /// @notice Withdraw pro-rata share of losing pool plus principal on winning side after settlement.
    function withdraw() external {
        require(state == State.Settled, "not settled");
        uint256 payout;
        if (winningSide == 1) {
            uint256 userYes = yesBalances[msg.sender];
            require(userYes > 0, "no bal");
            yesBalances[msg.sender] = 0;
            uint256 totalWin = totalYes;
            uint256 totalLose = totalNo;
            if (totalWin > 0) {
                payout = userYes + (userYes * totalLose) / totalWin;
            }
        } else {
            uint256 userNo = noBalances[msg.sender];
            require(userNo > 0, "no bal");
            noBalances[msg.sender] = 0;
            uint256 totalWin2 = totalNo;
            uint256 totalLose2 = totalYes;
            if (totalWin2 > 0) {
                payout = userNo + (userNo * totalLose2) / totalWin2;
            }
        }
        require(payout > 0, "zero pay");
        require(usdc.transfer(msg.sender, payout), "xfer fail");
        emit Withdrawn(msg.sender, payout);
    }
}
