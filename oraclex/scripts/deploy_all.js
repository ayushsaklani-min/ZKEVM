import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { ethers } from 'ethers';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

function findArtifactPath(name) {
  const hhRoot = path.join(root, 'artifacts', 'contracts');
  const fdy = path.join(root, 'out', `${name}.sol`, `${name}.json`);
  if (fs.existsSync(fdy)) return fdy;
  if (!fs.existsSync(hhRoot)) return null;
  const stack = [hhRoot];
  while (stack.length) {
    const dir = stack.pop();
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.isFile() && e.name === `${name}.json`) return p;
    }
  }
  return null;
}

function loadArtifact(name) {
  const p = findArtifactPath(name);
  if (!p) throw new Error(`Artifact for ${name} not found. Run: npx hardhat compile`);
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const abi = j.abi;
  const bytecode = j.bytecode?.object || j.bytecode; // HH vs Foundry
  return { abi, bytecode };
}

async function main() {
  const { RPC_URL, PRIVATE_KEY, USDC_ADDRESS } = process.env;
  if (!RPC_URL || !PRIVATE_KEY) throw new Error('RPC_URL and PRIVATE_KEY required');
  
  // Real USDC address on Polygon Amoy testnet
  const usdcAddress = USDC_ADDRESS || '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582';
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log('Deployer:', await wallet.getAddress());
  console.log('Using real USDC address:', usdcAddress);

  const deploy = async (name, args = []) => {
    const { abi, bytecode } = loadArtifact(name);
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    const contract = await factory.deploy(...args);
    console.log(`Deploying ${name}... tx=${contract.deploymentTransaction().hash}`);
    await contract.waitForDeployment();
    const addr = await contract.getAddress();
    console.log(`${name} at`, addr);
    return new ethers.Contract(addr, abi, wallet);
  };

  const adapter = await deploy('OracleXOracleAdapter', [ethers.ZeroAddress]);
  const verifier = await deploy('OracleXVerifier');
  const factory = await deploy('OracleXMarketFactory', [usdcAddress, await adapter.getAddress(), await verifier.getAddress()]);
  const setTx = await adapter.setFactory(await factory.getAddress());
  await setTx.wait();
  console.log('Adapter wired to factory');

  const deployed = {
    network: await provider.getNetwork().then(n => Number(n.chainId)),
    deployer: await wallet.getAddress(),
    USDC: usdcAddress,
    OracleXOracleAdapter: await adapter.getAddress(),
    OracleXVerifier: await verifier.getAddress(),
    OracleXMarketFactory: await factory.getAddress()
  };
  fs.writeFileSync(path.join(root, 'deployed.json'), JSON.stringify(deployed, null, 2));
  console.log('Wrote deployed.json');
  console.log('\n✅ Deployment complete!');
  console.log('Note: Users need to obtain USDC from a faucet or bridge to use the platform.');
}

main().catch((e) => { console.error(e); process.exit(1); });
