import dotenv from 'dotenv';
import '@nomicfoundation/hardhat-toolbox';

dotenv.config();

const { RPC_URL, PRIVATE_KEY } = process.env;

const config = {
  solidity: {
    version: '0.8.20',
    settings: { optimizer: { enabled: true, runs: 200 } }
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './hh-cache',
    artifacts: './artifacts'
  },
  networks: {
    hardhat: {},
    remote: {
      url: RPC_URL || 'https://rpc.public.zkevm-test.net',
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
};

export default config;
