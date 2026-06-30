use anchor_lang::prelude::*;

declare_id!("6QNd5mHvV7czVkrRNdLPmuUybSwwdPWq9RYuwk5LZuEb");

pub mod constants;
pub mod errors;
pub mod events;
pub mod state;
pub mod math;
pub mod instructions;
pub use instructions::*;

#[program]
pub mod proofmarket {
    use super::*;

    pub fn create_market(
        ctx: Context<CreateMarket>, market_id: u64, fixture_id: i64, stat_a_key: u32,
        stat_a_period: i32, threshold: i32, comparison: u8, resolve_after_ts_ms: i64, fee_bps: u16,
    ) -> Result<()> {
        instructions::create_market::handler(ctx, market_id, fixture_id, stat_a_key, stat_a_period, threshold, comparison, resolve_after_ts_ms, fee_bps)
    }
}
