import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const root = process.cwd();
const deployed = JSON.parse(fs.readFileSync(path.join(root, 'deployed.json'), 'utf8'));

function loadArtifact(name) {
  const p = path.join(root, 'out', `${name}.sol`, `${name}.json`);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

export async function postOutcome(marketId, winningSide) {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const art = loadArtifact('MockChainlinkOracle');
  const oracle = new ethers.Contract(deployed.MockChainlinkOracle, art.abi, wallet);
  const tx = await oracle.postOutcome(marketId, winningSide);
  return await tx.wait();
}
