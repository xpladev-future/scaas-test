use cosmwasm_std::{
    entry_point, to_json_binary, Binary, Deps, DepsMut, Empty, Env, MessageInfo, Storage,
    Response, StdResult
};

use crate::msg::{ AbiResponse, ExecuteMsg, QueryMsg };
use crate::state::{ ABI };

#[entry_point]
pub fn instantiate(
    _deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    _msg: Empty,
) -> StdResult<Response> {
    Ok(Response::new())
}

#[entry_point]
pub fn execute(_deps: DepsMut, _env: Env, _info: MessageInfo, _msg: ExecuteMsg) -> StdResult<Response> {
    match _msg {
        ExecuteMsg::StoreAbi { abi } => store_data(_deps.storage, abi),
    }
}

fn store_data(storage: &mut dyn Storage, abi: String) -> StdResult<Response> {
    ABI.save(storage, &abi);

    Ok(Response::new().add_attribute("action", "store_data").add_attribute("abi", abi))
}

#[entry_point]
pub fn query(_deps: Deps, _env: Env, _msg: QueryMsg) -> StdResult<Binary> {
    match _msg {
        QueryMsg::QueryAbi {} => get_abi(_deps.storage)
    }

}

fn get_abi(storage: &dyn Storage) -> StdResult<Binary> {
    let resp = AbiResponse{
        abi: ABI.load(storage)?
    };

    to_json_binary(&resp)
}
