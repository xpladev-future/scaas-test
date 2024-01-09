import { isTxError, LCDClient, MnemonicKey, MsgExecuteContract, MsgStoreCode, Wallet } from "@xpla/xpla.js";
import * as fs from 'fs'
import * as path from 'path'
import * as core from '@actions/core';

const cube = new LCDClient({
  chainID: 'cube_47-5',
  URL: 'https://cube-lcd.xpla.dev',
  gasPrices: "850000000000axpla"
})

const script = async () => {
  const projectName = process.argv[2]
  const recordContractAddress = process.argv[3]
  const adminMnemonic = process.argv[4]
  const wasmPath = projectName + ".wasm"

  const signerWallet = cube.wallet(new MnemonicKey({ mnemonic: adminMnemonic }))

  const storeTxResult = await storeWasm(signerWallet, wasmPath)
  const codeId = getCodeId(storeTxResult)
  console.log(storeTxResult)

  const recordTxResult = await recordCodeId(signerWallet, recordContractAddress, projectName, codeId)
  console.log(recordTxResult)

  await checkCodeId(recordContractAddress, projectName, codeId)
  await writeSummary(projectName, codeId, signerWallet.key.accAddress, storeTxResult.txhash, recordTxResult.txhash)
}

const getCodeId = (storeTxResult) => {
  const {
    store_code: { code_id },
  } = storeTxResult.logs[0].eventsByType

  console.log(code_id)
  return code_id[0]
}

const storeWasm = async (wallet: Wallet, wasmPath: string) => {
  const storeCode = new MsgStoreCode(
    wallet.key.accAddress,
    fs.readFileSync(path.resolve(__dirname, wasmPath), 'base64')
  )

  const storeCodeTx = await wallet.createAndSignTx({
    msgs: [storeCode],
  });

  const storeTxResult = await cube.tx.broadcast(storeCodeTx)

  if (isTxError(storeTxResult)) {
    throw new Error(
      `store wasm failed. code: ${storeTxResult.code}, codespace: ${storeTxResult.codespace}, raw_log: ${storeTxResult.raw_log}`
    );
  }

  return storeTxResult
}

const recordCodeId = async (wallet: Wallet, recordContractAddress: string, projectName: string, codeId: string) => {
  const testExec = new MsgExecuteContract(
    wallet.key.accAddress,
    recordContractAddress,
    {
      "store_cosmwasm_project": {
        "info": {
          "project_name": projectName,
          "code_id": codeId
        }
      }
    }
  );

  const tx = await wallet.createAndSignTx({
    msgs: [testExec],
  });

  const recordTxResult = await cube.tx.broadcast(tx);

  if (isTxError(recordTxResult)) {
    throw new Error(
      `record codeId failed. code: ${recordTxResult.code}, codespace: ${recordTxResult.codespace}, raw_log: ${recordTxResult.raw_log}`
    );
  }

  return recordTxResult
}

const checkCodeId = async (recordContractAddress: string, projectName: string, codeId: string) => {
  const result = await cube.wasm.contractQuery(
    recordContractAddress,
    {
      "get_code_id": { "project_name": projectName }
    }
  );

  if (codeId != result["cosmwasm_info"].code_id) {
    core.setFailed(`Code Id mismatch!`);
  }

  console.log("project name: " + projectName)
  console.log("code id: " + result["cosmwasm_info"].code_id)
}

const writeSummary = async (projectName: string, codeId: string, accAddress: string, storeHash: string, recordHash: string) => {
  await core.summary
    .addHeading('Results')
    .addTable([
      ['Project Name', projectName],
      ['Code Id', codeId],
      ['Signer Address', `<a href="https://explorer.xpla.io/testnet/address/${accAddress}">${accAddress}</a>`],
      ['Store Tx hash', `<a href="https://explorer.xpla.io/testnet/tx/${storeHash}">${storeHash}</a>`],
      ['Record Tx hash', `<a href="https://explorer.xpla.io/testnet/tx/${recordHash}">${recordHash}</a>`],
    ])
    .write()
}

script();