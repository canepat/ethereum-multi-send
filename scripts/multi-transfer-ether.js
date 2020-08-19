const EthereumTx = require("ethereumjs-tx").Transaction;
const {BN, bufferToHex, bufferToInt, setLengthRight, toBuffer} = require("ethereumjs-util");

const env = require("@nomiclabs/buidler");
const MultiTransferEther = env.artifacts.require("MultiTransferEther");
const multiTransferEtherContract = new web3.eth.Contract(MultiTransferEther.abi);

const range = require("./range");

function calculateTxValue(tx) {
  return new BN(tx.value).add(new BN(tx.gasLimit).mul(new BN(tx.gasPrice)));
}

function buildTrustlessMultiTransfer(account, addresses, amounts, gasPrice=20 * 10**9) {
  const multiTransferDeployBytecode = multiTransferEtherContract.deploy({
    data: MultiTransferEther.bytecode,
    arguments: [account, addresses, amounts.map((amount) => amount.toString(10))]
  }).encodeABI();
  const value = amounts.reduce((previous, current) => previous.add(current), new BN(0));
  const rawTx = {
    nonce: web3.utils.toHex(0),
    gasPrice: web3.utils.toHex(gasPrice),
    gasLimit: web3.utils.toHex(4000000),
    to: '0x0000000000000000000000000000000000000000',
    value: web3.utils.toBN(value),
    data: multiTransferDeployBytecode,
    v: 27,
    r: 0x0DA0DA0DA0DA0DA0DA0DA0DA0DA0DA0DA0DA0DA0DA0DA0DA0DA0DA0DA0DA0,
    s: 0x0DA0DA0DA0DA0DA0DA0DA0DA0DA0DA0DA0DA0DA0DA0DA0DA0DA0DA0DA0DA0,
  };
  const tx = new EthereumTx(rawTx);
  let sender;
  while (!sender) {
    try {
      senderAddress = bufferToHex(tx.getSenderAddress());
      if (!web3.utils.isAddress(senderAddress)) throw Error(`invalid address: ${senderAddress}`);
      sender = senderAddress;
      console.log(`TX ${bufferToHex(tx.hash())} sender: ${sender}`);
    } catch (err) {
      console.error(err);
      tx.r += 1;
    }
  }
  return tx;
}

function buildRecursiveTrustlessMultiTransfer(account, addresses, amounts, batchSize) {
  const transactions = [];

  range(0, addresses.length, batchSize).forEach(i => {
    console.log(`Batch: ${i/batchSize} START, [${i}, ${i + batchSize})`);
    const addressBatch = addresses.slice(i, i + batchSize);
    const amountBatch = amounts.slice(i, i + batchSize);
    const tx = buildTrustlessMultiTransfer(account, addressBatch, amountBatch);
    transactions.push(tx);
    console.log(`Batch: ${i/batchSize} END, num transactions: ${transactions.length}`);
    console.log(transactions.map(tx => bufferToHex(tx.hash())));
  });

  if (transactions.length == 1) {
    const [tx] = transactions;
    console.log(`ONE value: ${calculateTxValue(tx)}`);
    return [bufferToHex(tx.getSenderAddress()), calculateTxValue(tx), transactions];
  } else {
    const subaddresses = transactions.map(tx => bufferToHex(tx.getSenderAddress()));
    console.log(subaddresses);
    const subamounts = transactions.map(tx => calculateTxValue(tx));
    const [sender, value, subtransactions] = buildRecursiveTrustlessMultiTransfer(account, subaddresses, subamounts, batchSize);
    return [sender, value, transactions.concat(subtransactions)];
  }
}

async function main() {
  const accounts = await web3.eth.getAccounts(); // TODO: configure Ganache to generate 11440 address
  assert(accounts.length > 0, "no accounts on chain node");
  const [account] = accounts;

  const payouts = require("../test/440.json");
  const batchSize = 110;

  console.log(`MultiTransferEther for ${payouts.length} addresses grouped by ${batchSize}`);
  const addresses = payouts.map(payout => payout[0]);
  const amounts = payouts.map(payout => new BN(payout[1]));

  console.log(`Building multi-transfer...`);
  const [sender, value, transactions] = buildRecursiveTrustlessMultiTransfer(account, addresses, amounts, batchSize);
  console.log(`sender: ${sender} value: ${value} transactions:`);
  console.log(transactions.map(tx => bufferToHex(tx.hash())));
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
