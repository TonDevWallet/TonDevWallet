use crate::adnl_common::{
    AdnlPeers, Answer, QueryAnswer, QueryResult, Subscriber, TaggedByteVec, TaggedTlObject
};
use log::info;
use ton_api::{
    ton::{TLObject, adnl::Message as AdnlMessage},
    serialize_boxed, IntoBoxed
};
use ever_block::Result;
use std::{sync::Arc, time::Instant};

/// A simple echo subscriber that returns the same data it receives
pub struct EchoSubscriber;

#[async_trait::async_trait]
impl Subscriber for EchoSubscriber {
    async fn try_consume_custom(&self, data: &[u8], _peers: &AdnlPeers) -> Result<bool> {
        println!("LoggingSubscriber received custom data: {} bytes", data.len());
        Ok(false) // We don't consume it
    }
    
    async fn try_consume_object(&self, object: TLObject, _peers: &AdnlPeers) -> Result<bool> {
        println!("LoggingSubscriber received object: {:?}", object);
        Ok(false) // We don't consume it
    }

    async fn try_consume_query(
        &self,
        object: TLObject,
        _peers: &AdnlPeers
    ) -> Result<QueryResult> {
        // Simply echo back the same object we received
        println!("EchoSubscriber received an object");
        
        let query_data = match object.downcast::<AdnlMessage>() {
            Ok(m) => m.query().map(|q| q.to_vec()),
            Err(object) => {
                info!("EchoSubscriber received non-ADNL message: {:?}", object);
                return Ok(QueryResult::Rejected(object));
            }
        };
        
        info!("EchoSubscriber received query data: {:?}", query_data);
        let tagged = TaggedByteVec {
            object: query_data.unwrap_or_default(),
            #[cfg(feature = "telemetry")]
            tag: 0,
        };
        
        return Ok(QueryResult::Consumed(QueryAnswer::Ready(Some(Answer::Raw(tagged)))));
    }
}

/// A subscriber that logs received messages but doesn't consume them
pub struct LoggingSubscriber;

#[async_trait::async_trait]
impl Subscriber for LoggingSubscriber {
    async fn poll(&self, start: &Arc<Instant>) {
        println!("LoggingSubscriber polled: {:?} elapsed", start.elapsed());
    }
    
    async fn try_consume_custom(&self, data: &[u8], _peers: &AdnlPeers) -> Result<bool> {
        println!("LoggingSubscriber received custom data: {} bytes", data.len());
        Ok(false) // We don't consume it
    }
    
    async fn try_consume_object(&self, object: TLObject, _peers: &AdnlPeers) -> Result<bool> {
        println!("LoggingSubscriber received object: {:?}", object);
        Ok(false) // We don't consume it
    }
    
    async fn try_consume_query(
        &self,
        object: TLObject,
        _peers: &AdnlPeers
    ) -> Result<QueryResult> {
        println!("LoggingSubscriber received query");
        Ok(QueryResult::Rejected(object))
    }
}

/// A subscriber that handles a specific type of query
pub struct CustomTypeSubscriber;

#[async_trait::async_trait]
impl Subscriber for CustomTypeSubscriber {
    async fn try_consume_query(
        &self,
        object: TLObject,
        _peers: &AdnlPeers
    ) -> Result<QueryResult> {
        // In a real implementation, you would check for specific types
        // and handle them accordingly
        
        // For demonstration purposes, this just rejects all queries
        Ok(QueryResult::Rejected(object))
    }
}

// Example function showing how to create a list of subscribers
pub fn create_test_subscribers() -> Vec<Arc<dyn Subscriber>> {
    let mut subscribers: Vec<Arc<dyn Subscriber>> = Vec::new();
    
    // Add our test subscribers
    // subscribers.push(Arc::new(LoggingSubscriber));
    subscribers.push(Arc::new(EchoSubscriber));
    // subscribers.push(Arc::new(CustomTypeSubscriber));
    
    subscribers
} 