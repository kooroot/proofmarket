use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Market {
    pub bump: u8,
    pub vault_bump: u8,
    pub market_id: u64,
    pub creator: Pubkey,
    pub mint: Pubkey,
    pub fixture_id: i64,
    pub fee_destination: Pubkey,
    pub stat_a_key: u32,
    pub stat_a_period: i32,
    pub stat_b_key: Option<u32>,
    pub stat_b_period: Option<i32>,
    pub op: Option<u8>,
    pub threshold: i32,
    pub comparison: u8,
    pub resolve_after_ts: i64,
    pub created_at: i64,
    pub resolved_at: i64,
    pub state: u8,
    pub outcome: u8,
    pub yes_pool: u64,
    pub no_pool: u64,
    pub yes_stakers: u32,
    pub no_stakers: u32,
    pub total_positions: u32,
    pub fee_bps: u16,
    pub fee_amount: u64,
    pub payout_pool: u64,
    pub winning_pool: u64,
    pub claimed_amount: u64,
    pub claims_count: u32,
    pub proven_value_a: i32,
    pub proven_value_b: Option<i32>,
    pub daily_root: Pubkey,
    pub epoch_day: u16,
    pub event_stat_root: [u8; 32],
    pub events_sub_tree_root: [u8; 32],
    pub resolve_ts: i64,
    pub _reserve: [u8; 16],
}

#[account]
#[derive(InitSpace)]
pub struct Position {
    pub bump: u8,
    pub market: Pubkey,
    pub owner: Pubkey,
    pub yes_amount: u64,
    pub no_amount: u64,
    pub claimed: bool,
    pub _reserve: [u8; 16],
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn init_space_is_pinned() {
        assert_eq!(Market::INIT_SPACE, 362);
        assert_eq!(Position::INIT_SPACE, 98);
    }
}
