// Simplified ABIs for frontend use
// Full ABIs should be imported from contract artifacts

export const PREDICTION_AMM_ABI = [
  {
    inputs: [
      { name: 'marketId', type: 'bytes32' },
      { name: 'side', type: 'uint8' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'minSharesOut', type: 'uint256' },
    ],
    name: 'buy',
    outputs: [{ name: 'sharesOut', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'marketId', type: 'bytes32' },
      { name: 'side', type: 'uint8' },
      { name: 'sharesIn', type: 'uint256' },
      { name: 'minAmountOut', type: 'uint256' },
    ],
    name: 'sell',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'marketId', type: 'bytes32' }],
    name: 'markets',
    outputs: [
      { name: 'marketId', type: 'bytes32' },
      { name: 'yesPool', type: 'uint256' },
      { name: 'noPool', type: 'uint256' },
      { name: 'k', type: 'uint256' },
      { name: 'totalVolume', type: 'uint256' },
      { name: 'totalFees', type: 'uint256' },
      { name: 'active', type: 'bool' },
      { name: 'settled', type: 'bool' },
      { name: 'winningSide', type: 'uint8' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'marketId', type: 'bytes32' },
      { name: 'side', type: 'uint8' },
    ],
    name: 'getPrice',
    outputs: [{ name: 'price', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const MARKET_FACTORY_ABI = [
  {
    inputs: [
      { name: 'eventId', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'category', type: 'uint8' },
      { name: 'tags', type: 'string[]' },
      { name: 'closeTimestamp', type: 'uint256' },
      { name: 'resolutionTimestamp', type: 'uint256' },
      { name: 'initialYes', type: 'uint256' },
      { name: 'initialNo', type: 'uint256' },
    ],
    name: 'createMarket',
    outputs: [{ name: 'marketId', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'marketId', type: 'bytes32' }],
    name: 'getMarket',
    outputs: [
      { name: 'eventId', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'category', type: 'uint8' },
      { name: 'closeTimestamp', type: 'uint256' },
      { name: 'resolutionTimestamp', type: 'uint256' },
      { name: 'creator', type: 'address' },
      { name: 'active', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const USDC_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const ORX_TOKEN_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const VEORX_ABI = [
  {
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'duration', type: 'uint256' },
    ],
    name: 'createLock',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'locked',
    outputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'end', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const MARKET_POSITIONS_ABI = [
  {
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' },
    ],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const GOVERNANCE_ABI = [
  {
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    name: 'state',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'support', type: 'uint8' },
    ],
    name: 'castVote',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export const FEE_DISTRIBUTOR_ABI = [
  {
    inputs: [{ name: 'epochId', type: 'uint256' }],
    name: 'claimRewards',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'epochId', type: 'uint256' },
    ],
    name: 'getClaimableRewards',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const ORACLE_ADAPTER_ABI = [
  {
    inputs: [
      { name: 'marketId', type: 'bytes32' },
      { name: 'result', type: 'uint8' },
      { name: 'proof', type: 'bytes' },
    ],
    name: 'proposeOutcome',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'marketId', type: 'bytes32' }],
    name: 'finalizeOutcome',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'marketId', type: 'bytes32' }],
    name: 'getOutcome',
    outputs: [
      { name: 'result', type: 'uint8' },
      { name: 'proposedAt', type: 'uint256' },
      { name: 'finalized', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const TREASURY_ABI = [
  {
    inputs: [{ name: 'token', type: 'address' }],
    name: 'distributeFees',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'token', type: 'address' }],
    name: 'getBalance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;