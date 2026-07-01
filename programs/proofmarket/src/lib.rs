use anchor_lang::prelude::*;
use crate::txoracle_types::{ScoresBatchSummary, ProofNode, StatTerm};

declare_id!("6QNd5mHvV7czVkrRNdLPmuUybSwwdPWq9RYuwk5LZuEb");

pub mod constants;
pub mod errors;
pub mod events;
pub mod state;
pub mod math;
pub mod resolve_guards;
pub mod txoracle_types;
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
    pub fn stake(ctx: Context<Stake>, side: bool, amount: u64) -> Result<()> {
        instructions::stake::handler(ctx, side, amount)
    }
    pub fn resolve(
        ctx: Context<Resolve>, ts: i64, fixture_summary: ScoresBatchSummary,
        fixture_proof: Vec<ProofNode>, main_tree_proof: Vec<ProofNode>,
        stat_a: StatTerm, stat_b: Option<StatTerm>,
    ) -> Result<()> {
        instructions::resolve::handler(ctx, ts, fixture_summary, fixture_proof, main_tree_proof, stat_a, stat_b)
    }
    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        instructions::claim::handler(ctx)
    }
    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        instructions::refund::handler(ctx)
    }
    pub fn close_market(ctx: Context<CloseMarket>) -> Result<()> {
        instructions::close_market::handler(ctx)
    }
}
