use anchor_lang::prelude::*;

#[error_code(offset = 6100)]
pub enum ProofError {
    #[msg("market is not open")] MarketNotOpen,            // 6100
    #[msg("market is locked")] MarketLocked,               // 6101
    #[msg("amount is zero")] ZeroAmount,                   // 6102
    #[msg("stake below minimum")] StakeTooSmall,           // 6103
    #[msg("fee_bps exceeds maximum")] FeeTooHigh,          // 6104
    #[msg("predicate not supported in v1")] UnsupportedPredicate, // 6105
    #[msg("resolve before resolve_after_ts")] ResolveTooEarly,    // 6106
    #[msg("invalid market state")] InvalidState,           // 6107
    #[msg("wrong daily-scores root account")] WrongRootAccount,   // 6108
    #[msg("fixture id mismatch")] FixtureMismatch,         // 6109
    #[msg("predicate stat mismatch")] PredicateMismatch,   // 6110
    #[msg("unexpected second stat")] UnexpectedSecondStat, // 6111
    #[msg("final batch is stale")] StaleFinalBatch,        // 6112
    #[msg("wrong oracle program")] WrongOracleProgram,     // 6113
    #[msg("no return data")] NoReturnData,                 // 6114
    #[msg("bad return data")] BadReturnData,               // 6115
    #[msg("math overflow")] MathOverflow,                  // 6116
    #[msg("not claimable")] NotClaimable,                  // 6117
    #[msg("already claimed")] AlreadyClaimed,              // 6118
    #[msg("market is not void")] NotVoid,                  // 6119
    #[msg("market is not settled")] MarketNotSettled,      // 6120
    #[msg("vault is not empty")] VaultNotEmpty,            // 6121
    #[msg("failed to serialize CPI args")] SerializationFailed, // 6122
}

#[cfg(test)]
mod tests {
    use super::*;
    // The on-chain error code is produced by `From<ProofError> for u32` (= discriminant + offset).
    // Verify the namespace base (6100), the last pre-P1.10 code (6121), and the new P1.10 code (6122).
    #[test]
    fn codes_span_6100_to_6122() {
        assert_eq!(u32::from(ProofError::MarketNotOpen), 6100);
        assert_eq!(u32::from(ProofError::VaultNotEmpty), 6121);
        assert_eq!(u32::from(ProofError::SerializationFailed), 6122);
    }
}
