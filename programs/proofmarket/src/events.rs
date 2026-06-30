use anchor_lang::prelude::*;

#[event]
pub struct MarketCreated {
    pub market: Pubkey,
    pub market_id: u64,
    pub fixture_id: i64,
    pub stat_a_key: u32,
    pub stat_a_period: i32,
    pub threshold: i32,
    pub comparison: u8,
    pub resolve_after_ts: i64,
    pub fee_bps: u16,
    pub creator: Pubkey,
}

#[event]
pub struct Staked {
    pub market: Pubkey,
    pub owner: Pubkey,
    pub side: bool,
    pub amount: u64,
    pub yes_pool: u64,
    pub no_pool: u64,
}

#[event]
pub struct MarketResolved {
    pub market: Pubkey,
    pub fixture_id: i64,
    pub stat_a_key: u32,
    pub stat_a_period: i32,
    pub proven_value_a: i32,
    pub proven_value_b: Option<i32>,
    pub threshold: i32,
    pub comparison: u8,
    pub op: Option<u8>,
    pub predicate_true: bool,
    pub outcome: u8,
    pub daily_root: Pubkey,
    pub epoch_day: u16,
    pub event_stat_root: [u8; 32],
    pub events_sub_tree_root: [u8; 32],
    pub resolve_ts: i64,
    pub yes_pool: u64,
    pub no_pool: u64,
    pub fee_amount: u64,
    pub payout_pool: u64,
    pub winning_pool: u64,
    pub resolver: Pubkey,
}

#[event]
pub struct Claimed {
    pub market: Pubkey,
    pub owner: Pubkey,
    pub payout: u64,
}

#[event]
pub struct MarketVoided {
    pub market: Pubkey,
}
