use cosmwasm_schema::{cw_serde};

#[cw_serde]
pub enum ExecuteMsg {
    StoreAbi { abi: String }
}

#[cw_serde]
pub enum QueryMsg {
    QueryAbi { }
}

#[cw_serde]
pub struct AbiResponse {
    pub abi: String,
}
