import { Eth } from '../index';
import {
  AccountBalanceQuery,
  AccountId,
  Client,
  ContractCallQuery,
  ContractExecuteTransaction,
  ContractId,
  HbarUnit,
  Status,
  ContractByteCodeQuery
} from '@hashgraph/sdk';
import MirrorNode from './mirrorNode';
import {hashNumber} from '../formatters';

const cache = require('js-cache');

export class EthImpl implements Eth {
  private readonly client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  accounts() {
    return [];
  }

  // FIXME
  feeHistory() {
    const blockNum = '0x' + Date.now();
    return {
      baseFeePerGas: ['0x47'],
      gasUsedRatio: ['0.5'],
      oldestBlock: blockNum
    };
  }

  async getTransactionReceipt(hash: string) {
    const transactionId = cache.get(hash);

    if (!transactionId) {
      return null;
    }

    const record = await MirrorNode.getTransactionById(transactionId);

    if (record) {
      const blockHash = record.block_hash ? record.block_hash.slice(0, 66) : "";
      const blockNumber = hashNumber(record.block_number);
      let contractAddress;
      if (record.created_contract_ids?.length
        && record.created_contract_ids.indexOf(record.contract_id) !== -1) {
        contractAddress = '0x' + AccountId.fromString(record.contract_id).toSolidityAddress();
      }

      return {
        contractAddress: contractAddress || null,
        from: record.from,
        gasUsed: hashNumber(record.gas_used),
        logs: record.logs.map(log => {
          return {
            removed: false,
            logIndex: hashNumber(log.index),
            address: log.address,
            data: log.data || "0x",
            topics: log.topics,
            transactionHash: hash,
            blockHash: blockHash,
            blockNumber: blockNumber,

            // TODO change the hardcoded values
            transactionIndex: "0x0"
          };
        }),

        logsBloom: record.bloom,
        status: record.status,
        to: record.to,
        transactionHash: hash,
        blockHash: blockHash,
        blockNumber: blockNumber,

        // TODO change the hardcoded values
        transactionIndex: '0x0',

        // TODO: this is to be returned from the mirror node as part of the transaction.
        cumulativeGasUsed: '0x' + Number(record.gas_used).toString(),
        effectiveGasPrice: '0x',
        root: '0x'
      };
    }
    else {
      return null;
    }
  }

  // FIXME: We should have a legit block number, and we should get it from the mirror node
  blockNumber() {
    return Date.now();
  }

  chainId(): string {
    return process.env.CHAIN_ID || '';
  }

  // FIXME Somehow compute the amount of gas for this request...
  estimateGas(): number {
    return 0x10000;
  }

  // FIXME, fake.
  gasPrice(): number {
    return 0x2f;
  }

  // TODO: blockNumber doesn't work atm
  async getBalance(account: string, blockNumber: string | null): Promise<string> {
    try {
      const balanceQuery = new AccountBalanceQuery({
        accountId: AccountId.fromSolidityAddress(account)
      });
      const balance = await balanceQuery.execute(this.client);
      const weibars = balance.hbars
        .to(HbarUnit.Tinybar)
        .multipliedBy(10_000_000_000);

      return '0x' + weibars.toString(16);
    } catch (e: any) {
      // handle INVALID_ACCOUNT_ID
      if (e?.status?._code === Status.InvalidAccountId._code) {
        return '0x';
      }

      throw(e);
    }
  }

  // TODO: blockNumber doesn't work atm
  async getCode(address: string, blockNumber: string | null): Promise<string> {
    try {
      const query = new ContractByteCodeQuery()
          .setContractId(AccountId.fromSolidityAddress(address).toString());
      const bytecode = await query.execute(this.client);

      return '0x' + Buffer.from(bytecode).toString('hex');
    } catch (e: any) {
      // handle INVALID_CONTRACT_ID
      if (e?.status?._code === Status.InvalidContractId._code) {
        return '0x';
      }

      throw(e);
    }
  }

  // FIXME This is a totally fake implementation
  getBlockByHash(hash: string): any {
    const blockNum = '0x' + Date.now();
    return {
      difficulty: '0x1',
      extraData: '',
      gasLimit: '0xe4e1c0',
      baseFeePerGas: '0x1',
      gasUsed: '0x0',
      hash: hash,
      logsBloom: '0x0',
      miner: '',
      mixHash:
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      nonce: '0x0000000000000000',
      number: blockNum,
      parentHash: '0x0',
      receiptsRoot: '0x0',
      sha3Uncles: '0x0',
      size: '0x0',
      stateRoot: '0x0',
      timestamp: blockNum,
      totalDifficulty: blockNum,
      transactions: [],
      transactionsRoot: '0x00',
      uncles: []
    };
  }

  // FIXME This is a totally fake implementation
  getBlockByNumber(blockNum: number): any {
    return {
      difficulty: '0x1',
      extraData: '',
      gasLimit: '0xe4e1c0',
      baseFeePerGas: '0x1',
      gasUsed: '0x0',
      hash: '0x1fb2230a6b5bf856bb4df3c80cbf95b84454169a5a133fffaf8505a05f960aeb',
      logsBloom: '0x0',
      miner: '',
      mixHash:
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      nonce: '0x0000000000000000',
      number: blockNum,
      parentHash: '0x0',
      receiptsRoot: '0x0',
      sha3Uncles: '0x0',
      size: '0x0',
      stateRoot: '0x0',
      timestamp: blockNum,
      totalDifficulty: blockNum,
      transactions: [],
      transactionsRoot: '0x00',
      uncles: []
    };
  }

  // FIXME
  getTransactionCount(): number {
    return 0x1;
  }

  async sendRawTransaction(transaction: string): Promise<string> {
    let txRequest: ContractExecuteTransaction | null;

    txRequest = new ContractExecuteTransaction();

    txRequest = txRequest.populateFromForeignTransaction(transaction);

    const contractExecuteResponse = await txRequest.execute(this.client);

    const txnHash = contractExecuteResponse.transactionHash;

    const hashString =
      '0x' + Buffer.from(txnHash).toString('hex').substring(0, 64);

    cache.set(hashString, contractExecuteResponse.transactionId);

    return hashString;
  }

  async call(call: any, blockParam: string) {
    try {
      let gas: number;
      if (call.gas == null) {
        gas = 400_000;
      } else {
        gas = typeof call.gas === 'string' ? Number(call.gas) : call.gas;
      }

      const data: string = call.data.startsWith('0x')
        ? call.data.substring(2)
        : call.data;

      const contractCallQuery = new ContractCallQuery()
        .setContractId(ContractId.fromEvmAddress(0, 0, call.to))
        .setFunctionParameters(Buffer.from(data, 'hex'))
        .setGas(gas);

      if (call.from != null) {
        let lookup = call.from;
        if (lookup.startsWith('0x')) {
          lookup = lookup.substring(2);
        }
        const senderId = AccountId.fromSolidityAddress(lookup);
        contractCallQuery.setSenderId(senderId);
      }

      const contractCallResponse = await contractCallQuery.execute(this.client);
      return '0x' + Buffer.from(contractCallResponse.asBytes()).toString('hex');
    } catch (e) {
      console.log(e);
      throw e;
    }
  }
  
  async mining() {
    return false;
  }

  async submitWork() {
    return false;
  }

  async syncing() {
    return false;
  }

  async getUncleByBlockHashAndIndex() {
    return null;
  }

  async getUncleByBlockNumberAndIndex() {
    return null;
  }

  async getUncleCountByBlockHash() {
    return '0x0';
  }

  async getUncleCountByBlockNumber() {
    return '0x0';
  }

  async hashrate() {
    return '0x0';
  }
  
}
