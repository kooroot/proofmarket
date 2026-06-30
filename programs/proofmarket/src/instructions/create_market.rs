use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::ProofError;

pub fn validate_create_params(
    fee_bps: u16,
    comparison: u8,
    stat_a_key: u32,
    resolve_after_ts_ms: i64,
    now_ms: i64,
) -> Result<()> {
    require!(fee_bps <= MAX_FEE_BPS, ProofError::FeeTooHigh);
    require!(resolve_after_ts_ms > now_ms, ProofError::ResolveTooEarly);
    require!(
        comparison == CMP_GT && is_monotone_cumulative(stat_a_key),
        ProofError::UnsupportedPredicate
    );
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    const NOW: i64 = 1_000_000_000_000;
    #[test] fn accepts_gt_monotone_future() {
        assert!(validate_create_params(1000, CMP_GT, 1, NOW + 1, NOW).is_ok());
    }
    #[test] fn rejects_fee_over_cap() {
        assert!(validate_create_params(1001, CMP_GT, 1, NOW + 1, NOW).is_err());
    }
    #[test] fn rejects_past_resolve_ts() {
        assert!(validate_create_params(1000, CMP_GT, 1, NOW, NOW).is_err());
    }
    #[test] fn rejects_non_greaterthan() {
        assert!(validate_create_params(1000, CMP_LT, 1, NOW + 1, NOW).is_err());
    }
    #[test] fn rejects_non_monotone_key() {
        assert!(validate_create_params(1000, CMP_GT, 999, NOW + 1, NOW).is_err());
    }
}
