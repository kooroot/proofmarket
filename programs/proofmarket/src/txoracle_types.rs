//! Hand-redeclared Borsh layout for txoracle::validate_stat args.
//! Byte-identical to the Anchor TS coder (proven in P0.4) and to probe_validate/src/idl_types.rs.
//! Used both as `resolve` instruction args (→ IDL) and to serialize the raw-invoke CPI payload.
//! declare_program!(txoracle) is intentionally NOT used (0.31.1 codegen fails on the txoracle IDL — P0.5).
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ScoreStat {
    pub key:    u32,
    pub value:  i32,
    pub period: i32,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ScoresUpdateStats {
    pub update_count:  i32,  // i32 per devnet.mdx — NOT u32
    pub min_timestamp: i64,
    pub max_timestamp: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ScoresBatchSummary {
    pub fixture_id:           i64,
    pub update_stats:         ScoresUpdateStats,
    pub events_sub_tree_root: [u8; 32],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ProofNode {
    pub hash:             [u8; 32],
    pub is_right_sibling: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct StatTerm {
    pub stat_to_prove:   ScoreStat,
    pub event_stat_root: [u8; 32],
    pub stat_proof:      Vec<ProofNode>,
}

/// Borsh discriminants: GreaterThan=0, LessThan=1, EqualTo=2 (matches txoracle IDL order).
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum Comparison {
    GreaterThan,
    LessThan,
    EqualTo,
}

/// Borsh discriminants: Add=0, Subtract=1.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum BinaryExpression {
    Add,
    Subtract,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct TraderPredicate {
    pub threshold:  i32,
    pub comparison: Comparison,
}

/// Top-level validate_stat args (discriminator-prefixed for the raw CPI).
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ValidateStatArgs {
    pub ts:              i64,
    pub fixture_summary: ScoresBatchSummary,
    pub fixture_proof:   Vec<ProofNode>,
    pub main_tree_proof: Vec<ProofNode>,
    pub predicate:       TraderPredicate,
    pub stat_a:          StatTerm,
    pub stat_b:          Option<StatTerm>,
    pub op:              Option<BinaryExpression>,
}
