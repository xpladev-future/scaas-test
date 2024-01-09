import { isTxError, LCDClient, MnemonicKey, MsgExecuteContract, MsgStoreCode } from "@xpla/xpla.js";
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

  const cube_wallet = cube.wallet(new MnemonicKey({ mnemonic: adminMnemonic }))

  const storeCode = new MsgStoreCode(
    cube_wallet.key.accAddress,
    fs.readFileSync(path.resolve(__dirname, wasmPath), 'base64')
  )

  const storeCodeTx = await cube_wallet.createAndSignTx({
    msgs: [storeCode],
  });

  const storeTxResult = await cube.tx.broadcast(storeCodeTx);

  console.log(storeTxResult);

  if (isTxError(storeTxResult)) {
    throw new Error(
      `store code failed. code: ${storeTxResult.code}, codespace: ${storeTxResult.codespace}, raw_log: ${storeTxResult.raw_log}`
    );
  }

  const {
    store_code: { code_id },
  } = storeTxResult.logs[0].eventsByType;

  console.log(code_id)

  const testExec = new MsgExecuteContract(
    cube_wallet.key.accAddress,
    recordContractAddress,
    {
      "store_cosmwasm_project": {
        "info": {
          "project_name": projectName,
          "code_id": code_id[0].toString()
        }
      }
    }
  );

  console.log(code_id[0])

  const tx = await cube_wallet.createAndSignTx({
    msgs: [testExec],
  });

  const recordTxResult = await cube.tx.broadcast(tx);

  console.log(recordTxResult);

  await checkCodeId(recordContractAddress, projectName, code_id[0])
  await writeSummary(projectName, code_id[0], cube_wallet.key.accAddress, storeTxResult.txhash, recordTxResult.txhash)
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