use serde_derive::{Deserialize, Serialize};
use ton_api::{ton, BareSerialize, BoxedDeserialize, BoxedSerialize, ConstructorNumber, Deserializer};
use ever_block::{
    Result
};
use std::option::Option;
use std::error::Error;

#[derive(Debug, Clone, PartialEq, Default)]
#[doc = "TL-derived from `devwallet.Ok`\n\n```text\ndevwallet.ok = devwallet.Ok;\n\ndevwallet.sendProxyTransaction tx_json_data:bytes = devwallet.Ok;\n```\n"]
pub enum Ok {
    #[default]
    Devwallet_Ok,
    Devwallet_SendProxyTransaction(ok::SendProxyTransaction),
}
impl Ok {
    pub fn tx_json_data(&self) -> Option<&ton::bytes> {
        match self {
            Ok::Devwallet_SendProxyTransaction(ref x) => Some(&x.tx_json_data),
            _ => None,
        }
    }
}
impl Eq for Ok {}
impl BoxedSerialize for Ok {
    fn serialize_boxed(&self) -> (ConstructorNumber, &dyn BareSerialize) {
        match self {
            Ok::Devwallet_Ok => (ConstructorNumber(0x62dbfa31), &()),
            Ok::Devwallet_SendProxyTransaction(x) => (ConstructorNumber(0x2ef10683), x),
        }
    }
}
impl BoxedDeserialize for Ok {
    fn possible_constructors() -> Vec<ConstructorNumber> {
        vec![
            ConstructorNumber(0x62dbfa31),
            ConstructorNumber(0x2ef10683),
        ]
    }
    fn deserialize_boxed(
        _id: ConstructorNumber,
        _de: &mut Deserializer,
    ) -> Result<Self> {
        match _id {
            ConstructorNumber(0x62dbfa31) => Ok(Ok::Devwallet_Ok),
            ConstructorNumber(0x2ef10683) => Ok(Ok::Devwallet_SendProxyTransaction(
                _de.read_bare::<ok::SendProxyTransaction>()?,
            )),
            id => Err(std::io::Error::new(std::io::ErrorKind::InvalidData, 
                format!("Invalid constructor id: {:x}", id.0)).into()),
        }
    }
}

// Newtype wrapper to satisfy orphan rules
#[derive(Debug, Clone, PartialEq, Default)]
pub struct OptionalSendProxyTransaction(pub Option<ok::SendProxyTransaction>);

impl BoxedSerialize for OptionalSendProxyTransaction {
    fn serialize_boxed(&self) -> (ConstructorNumber, &dyn BareSerialize) {
        match self.0 {
            None => (ConstructorNumber(0x62dbfa31), &()),
            Some(ref x) => (ConstructorNumber(0x2ef10683), x),
        }
    }
}

impl BoxedDeserialize for OptionalSendProxyTransaction {
    fn possible_constructors() -> Vec<ConstructorNumber> {
        vec![
            ConstructorNumber(0x62dbfa31),
            ConstructorNumber(0x2ef10683),
        ]
    }
    fn deserialize_boxed(
        _id: ConstructorNumber,
        _de: &mut Deserializer,
    ) -> Result<Self> {
        match _id {
            ConstructorNumber(0x62dbfa31) => Ok(OptionalSendProxyTransaction(None)),
            ConstructorNumber(0x2ef10683) => Ok(OptionalSendProxyTransaction(Some(
                _de.read_bare::<ok::SendProxyTransaction>()?,
            ))),
            id => Err(std::io::Error::new(std::io::ErrorKind::InvalidData, 
                format!("Invalid constructor id: {:x}", id.0)).into()),
        }
    }
}
pub mod ok;
pub mod rpc;
