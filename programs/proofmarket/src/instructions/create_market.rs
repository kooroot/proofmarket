use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::ProofError;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::events::MarketCreated;
use crate::state::Market;

pub fn validate_create_params(
    fee_bps: u16,
    comparison: u8,
    stat_a_key: u32,
    stat_b_key: Option<u32>,
    op: Option<u8>,
    resolve_after_ts_ms: i64,
    now_ms: i64,
) -> Result<()> {
    require!(fee_bps <= MAX_FEE_BPS, ProofError::FeeTooHigh);
    require!(resolve_after_ts_ms > now_ms, ProofError::ResolveTooEarly);
    require!(comparison == CMP_GT && is_monotone_cumulative(stat_a_key), ProofError::UnsupportedPredicate);
    match (stat_b_key, op) {
        (None, None) => Ok(()),
        (Some(k), Some(OP_ADD | OP_SUBTRACT)) if is_monotone_cumulative(k) => Ok(()),
        _ => err!(ProofError::UnsupportedPredicate),
    }
}

fn validate_second_stat_period(stat_b_key: Option<u32>, stat_b_period: Option<i32>) -> Result<()> {
    require!(
        stat_b_key.is_some() == stat_b_period.is_some(),
        ProofError::UnsupportedPredicate
    );
    Ok(())
}

#[derive(Accounts)]
#[instruction(market_id: u64)]
pub struct CreateMarket<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        init, payer = creator, space = 8 + Market::INIT_SPACE,
        seeds = [b"market", market_id.to_le_bytes().as_ref()], bump
    )]
    pub market: Account<'info, Market>,
    #[account(
        init, payer = creator,
        seeds = [b"vault", market.key().as_ref()], bump,
        token::mint = mint, token::authority = market
    )]
    pub vault: Account<'info, TokenAccount>,
    // Mint-agnostic (pre-flight F3): NO `address = USDC_MINT` pin; recorded into Market.mint and
    // enforced per-market by stake/claim/resolve.
    pub mint: Account<'info, Mint>,
    #[account(token::mint = mint)]
    pub fee_destination: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<CreateMarket>, market_id: u64, fixture_id: i64, stat_a_key: u32,
    stat_a_period: i32, stat_b_key: Option<u32>, stat_b_period: Option<i32>, op: Option<u8>,
    threshold: i32, comparison: u8, resolve_after_ts_ms: i64, fee_bps: u16,
) -> Result<()> {
    let now_ms = Clock::get()?.unix_timestamp.checked_mul(1000).ok_or(error!(ProofError::MathOverflow))?;
    validate_create_params(fee_bps, comparison, stat_a_key, stat_b_key, op, resolve_after_ts_ms, now_ms)?;
    validate_second_stat_period(stat_b_key, stat_b_period)?;

    let market = &mut ctx.accounts.market;
    market.bump = ctx.bumps.market;
    market.vault_bump = ctx.bumps.vault;
    market.market_id = market_id;
    market.creator = ctx.accounts.creator.key();
    market.mint = ctx.accounts.mint.key();
    market.fixture_id = fixture_id;
    market.fee_destination = ctx.accounts.fee_destination.key();
    market.stat_a_key = stat_a_key;
    market.stat_a_period = stat_a_period;
    market.stat_b_key = stat_b_key;
    market.stat_b_period = stat_b_period;
    market.op = op;
    market.threshold = threshold;
    market.comparison = comparison;
    market.resolve_after_ts = resolve_after_ts_ms;
    market.created_at = now_ms;
    market.state = ST_OPEN;
    market.outcome = OUT_UNSET;
    market.fee_bps = fee_bps;
    market.proven_value_b = None;

    emit!(MarketCreated {
        market: market.key(), market_id, fixture_id, stat_a_key, stat_a_period,
        stat_b_key, stat_b_period, op,
        threshold, comparison, resolve_after_ts: resolve_after_ts_ms, fee_bps, creator: market.creator,
    });
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    const NOW: i64 = 1_000_000_000_000;
    #[test] fn accepts_gt_monotone_future() {
        assert!(validate_create_params(1000, CMP_GT, 1, None, None, NOW + 1, NOW).is_ok());
    }
    #[test] fn accepts_two_stat_add_or_subtract_over_monotone_keys() {
        assert!(validate_create_params(1000, CMP_GT, 1, Some(2), Some(OP_ADD), NOW + 1, NOW).is_ok());
        assert!(validate_create_params(1000, CMP_GT, 7, Some(8), Some(OP_SUBTRACT), NOW + 1, NOW).is_ok());
    }
    #[test] fn rejects_fee_over_cap() {
        assert!(validate_create_params(1001, CMP_GT, 1, None, None, NOW + 1, NOW).is_err());
    }
    #[test] fn rejects_past_resolve_ts() {
        assert!(validate_create_params(1000, CMP_GT, 1, None, None, NOW, NOW).is_err());
    }
    #[test] fn rejects_non_greaterthan() {
        assert!(validate_create_params(1000, CMP_LT, 1, None, None, NOW + 1, NOW).is_err());
    }
    #[test] fn rejects_non_monotone_key() {
        assert!(validate_create_params(1000, CMP_GT, 999, None, None, NOW + 1, NOW).is_err());
    }
    #[test] fn rejects_incomplete_or_invalid_two_stat_config() {
        assert!(validate_create_params(1000, CMP_GT, 1, Some(2), None, NOW + 1, NOW).is_err());
        assert!(validate_create_params(1000, CMP_GT, 1, None, Some(OP_ADD), NOW + 1, NOW).is_err());
        assert!(validate_create_params(1000, CMP_GT, 1, Some(999), Some(OP_ADD), NOW + 1, NOW).is_err());
        assert!(validate_create_params(1000, CMP_GT, 1, Some(2), Some(9), NOW + 1, NOW).is_err());
    }
}
