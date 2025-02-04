// @flow

import type { Account, Operation } from "../../types";
import { getEnv } from "../../env";
import { libcoreAmountToBigNumber } from "../../libcore/buildBigNumber";
import type { CoreTezosLikeTransaction, Transaction } from "./types";
import type { CoreAccount } from "../../libcore/types";

async function tezos({
  account: { id, balance },
  signedTransaction,
  builded,
  coreAccount,
  transaction
}: {
  account: Account,
  signedTransaction: string,
  builded: CoreTezosLikeTransaction,
  coreAccount: CoreAccount,
  transaction: Transaction
}) {
  const tezosLikeAccount = await coreAccount.asTezosLikeAccount();

  const txHash = getEnv("DISABLE_TRANSACTION_BROADCAST")
    ? ""
    : await tezosLikeAccount.broadcastRawTransaction(signedTransaction);
  const receiver = await builded.getReceiver();
  const sender = await builded.getSender();
  const recipients = [await receiver.toBase58()];
  const senders = [await sender.toBase58()];
  const feesRaw = await builded.getFees();
  const fees = await libcoreAmountToBigNumber(feesRaw);
  const gasLimitRaw = await builded.getGasLimit();
  const gasLimit = await libcoreAmountToBigNumber(gasLimitRaw);

  const fee = fees.times(gasLimit);

  const accountId = transaction.subAccountId || id;

  // FIXME we do not correctly handle subAccount
  const op: $Exact<Operation> = {
    id: `${accountId}-${txHash}-OUT`,
    hash: txHash,
    type: "OUT",
    value: transaction.useAllAmount ? balance : transaction.amount.plus(fee),
    fee,
    blockHash: null,
    blockHeight: null,
    senders,
    recipients,
    accountId,
    date: new Date(),
    extra: {}
  };

  return op;
}

export default tezos;
