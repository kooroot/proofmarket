use anchor_lang::prelude::*;

declare_id!("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");

#[program]
pub mod txoracle {
    use super::*;

    pub fn validate_stat(
        _ctx: Context<ValidateStat>,
        _ts: i64,
        fixture_summary: ScoresBatchSummary,
        fixture_proof: Vec<ProofNode>,
        main_tree_proof: Vec<ProofNode>,
        predicate: TraderPredicate,
        stat_a: StatTerm,
        stat_b: Option<StatTerm>,
        op: Option<BinaryExpression>,
    ) -> Result<bool> {
        require!(
            fixture_summary.update_stats.max_timestamp >= fixture_summary.update_stats.min_timestamp,
            TxoracleFixtureError::InvalidSummary
        );
        require!(
            !fixture_proof.is_empty() && !main_tree_proof.is_empty() && !stat_a.stat_proof.is_empty(),
            TxoracleFixtureError::MissingProof
        );

        let lhs = match (stat_b, op) {
            (None, None) => stat_a.stat_to_prove.value,
            (Some(b), Some(BinaryExpression::Add)) => stat_a
                .stat_to_prove
                .value
                .checked_add(b.stat_to_prove.value)
                .ok_or(error!(TxoracleFixtureError::MathOverflow))?,
            (Some(b), Some(BinaryExpression::Subtract)) => stat_a
                .stat_to_prove
                .value
                .checked_sub(b.stat_to_prove.value)
                .ok_or(error!(TxoracleFixtureError::MathOverflow))?,
            _ => return err!(TxoracleFixtureError::MalformedPredicate),
        };

        let predicate_true = match predicate.comparison {
            Comparison::GreaterThan => lhs > predicate.threshold,
            Comparison::LessThan => lhs < predicate.threshold,
            Comparison::EqualTo => lhs == predicate.threshold,
        };
        Ok(predicate_true)
    }
}

#[derive(Accounts)]
pub struct ValidateStat<'info> {
    /// CHECK: this fixture mirrors txoracle's read-only daily root account surface for bankrun.
    #[account(owner = crate::ID)]
    pub daily_scores_merkle_roots: UncheckedAccount<'info>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ScoreStat {
    pub key: u32,
    pub value: i32,
    pub period: i32,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ScoresUpdateStats {
    pub update_count: i32,
    pub min_timestamp: i64,
    pub max_timestamp: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ScoresBatchSummary {
    pub fixture_id: i64,
    pub update_stats: ScoresUpdateStats,
    pub events_sub_tree_root: [u8; 32],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ProofNode {
    pub hash: [u8; 32],
    pub is_right_sibling: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct StatTerm {
    pub stat_to_prove: ScoreStat,
    pub event_stat_root: [u8; 32],
    pub stat_proof: Vec<ProofNode>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum Comparison {
    GreaterThan,
    LessThan,
    EqualTo,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum BinaryExpression {
    Add,
    Subtract,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct TraderPredicate {
    pub threshold: i32,
    pub comparison: Comparison,
}

#[error_code]
pub enum TxoracleFixtureError {
    #[msg("fixture summary timestamps are invalid")]
    InvalidSummary,
    #[msg("fixture proof vectors must be present")]
    MissingProof,
    #[msg("binary predicate shape is malformed")]
    MalformedPredicate,
    #[msg("predicate math overflow")]
    MathOverflow,
}
