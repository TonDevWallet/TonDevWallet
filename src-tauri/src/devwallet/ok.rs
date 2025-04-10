use serde_derive::{Deserialize, Serialize};
use ton_api::{ton, BareDeserialize, BareSerialize, BoxedDeserialize, BoxedSerialize, ConstructorNumber, Deserializer, IntoBoxed, Serializer};
use ever_block::{
    Result
};

#[derive(Debug, Default, Clone, PartialEq)]
#[doc = "TL-derived from `devwallet.sendProxyTransaction`\n\n```text\ndevwallet.sendProxyTransaction tx_json_data:bytes = devwallet.Ok;\n```\n"]
pub struct SendProxyTransaction {
    pub tx_json_data: ton::bytes,
}
impl Eq for SendProxyTransaction {}
impl BareSerialize for SendProxyTransaction {
    fn constructor(&self) -> ConstructorNumber {
        ConstructorNumber(0x2ef10683)
    }
    fn serialize_bare(&self, _ser: &mut Serializer) -> Result<()> {
        let SendProxyTransaction { tx_json_data } = self;
        _ser.write_bare::<ton::bytes>(tx_json_data)?;
        Ok(())
    }
}
impl BareDeserialize for SendProxyTransaction {
    fn deserialize_bare(_de: &mut Deserializer) -> Result<Self> {
        {
            let tx_json_data = _de.read_bare::<ton::bytes>()?;
            Ok(Self { tx_json_data })
        }
    }
}
impl BoxedDeserialize for SendProxyTransaction {
    fn possible_constructors() -> Vec<ConstructorNumber> {
        vec![ConstructorNumber(0x2ef10683)]
    }
    fn deserialize_boxed(
        id: ConstructorNumber,
        de: &mut Deserializer,
    ) -> Result<Self> {
        if id == ConstructorNumber(0x2ef10683) {
            de.read_bare()
        } else {
            Err(std::io::Error::new(std::io::ErrorKind::InvalidData, 
                format!("Invalid constructor id: {:x}", id.0)).into())
        }
    }
}
impl BoxedSerialize for SendProxyTransaction {
    fn serialize_boxed(&self) -> (ConstructorNumber, &dyn BareSerialize) {
        (ConstructorNumber(0x2ef10683), self)
    }
}
impl IntoBoxed for SendProxyTransaction {
    type Boxed = crate::devwallet::Ok;
    fn into_boxed(self) -> crate::devwallet::Ok {
        crate::devwallet::Ok::Devwallet_SendProxyTransaction(self)
    }
}
