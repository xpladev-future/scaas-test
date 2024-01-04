import { LCDClient } from "@xpla/xpla.js";

// github evn로 처리
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

    console.log("project name : " + projectName)
    console.log("code id:  " + result["cosmwasm_info"].code_id)
}

query()