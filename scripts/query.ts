import { LCDClient } from "@xpla/xpla.js";
import * as core from '@actions/core';

const cube = new LCDClient({
    chainID: 'cube_47-5',
    URL: 'https://cube-lcd.xpla.dev',
    gasPrices: "850000000000axpla"
})

const query = async () => {

    const projectName = process.argv[2]
    const recordContractAddress = process.argv[3]

    const result = await cube.wasm.contractQuery(
        recordContractAddress,
        {
            "get_code_id": { "project_name" : projectName }
        }
    );

    var code_id = core.getState("code_id");
    if (code_id != result["cosmwasm_info"].code_id) {
        core.setFailed(`Code Id mismatch!`);
    }

    console.log("project name : " + projectName)
    console.log("code id:  " + result["cosmwasm_info"].code_id)
    
}

query()