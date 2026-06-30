/// Hand-redeclared Borsh layout for txoracle::validate_stat args.
/// Field order and types mirror devnet.mdx exactly (P0.4, G1 pre-deploy guard).
///
/// Key type notes (from IDL / devnet.mdx cross-checked):
///   ScoreStat.key                       : u32
///   ScoreStat.value                     : i32
///   ScoreStat.period                    : i32
///   ScoresUpdateStats.update_count      : i32  (NOT u32 — devnet.mdx:2914, IDL confirms i32)
///   ScoresBatchSummary.fixture_id       : i64
///   TraderPredicate.threshold           : i32
///   TraderPredicate.comparison          : u8   (Comparison enum discriminant:
///                                               GreaterThan=0, LessThan=1, EqualTo=2)
///   ValidateStatArgs.op                 : Option<u8>  (BinaryExpression: Add=0, Subtract=1)
use anchor_lang::prelude::*;

// ── Leaf: single provable key-value stat ─────────────────────────────────────
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ScoreStat {
    pub key:    u32,
    pub value:  i32,
    pub period: i32,
}

// ── Per-fixture update metadata ───────────────────────────────────────────────
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ScoresUpdateStats {
    pub update_count:  i32,  // i32 per devnet.mdx — NOT u32
    pub min_timestamp: i64,
    pub max_timestamp: i64,
}

// ── Fixture-level summary (sub-tree root) ─────────────────────────────────────
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ScoresBatchSummary {
    pub fixture_id:           i64,
    pub update_stats:         ScoresUpdateStats,
    pub events_sub_tree_root: [u8; 32],
}

// ── Single Merkle proof node ──────────────────────────────────────────────────
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ProofNode {
    pub hash:             [u8; 32],
    pub is_right_sibling: bool,
}

// ── Stat term (stat + its Merkle proof) ──────────────────────────────────────
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct StatTerm {
    pub stat_to_prove:   ScoreStat,
    pub event_stat_root: [u8; 32],
    pub stat_proof:      Vec<ProofNode>,
}

// ── Comparison enum ──────────────────────────────────────────────────────────
/// Borsh discriminants: GreaterThan=0, LessThan=1, EqualTo=2.
/// Matches txoracle IDL variant order exactly.
/// Using an enum (not u8) so the probe program IDL exposes the proper type,
/// allowing the TS client to pass `{lessThan:{}}` format.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum Comparison {
    GreaterThan,
    LessThan,
    EqualTo,
}

// ── BinaryExpression enum ─────────────────────────────────────────────────────
/// Borsh discriminants: Add=0, Subtract=1.
/// Matches txoracle IDL variant order exactly.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum BinaryExpression {
    Add,
    Subtract,
}

// ── Predicate ─────────────────────────────────────────────────────────────────
/// comparison: typed Comparison enum (GreaterThan=0, LessThan=1, EqualTo=2).
/// Byte-identical to the previous u8 approach — enum discriminants serialize
/// as a single u8 in Borsh, same as the explicit u8 field.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct TraderPredicate {
    pub threshold:  i32,
    pub comparison: Comparison,
}

// ── Top-level validate_stat args ──────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Byte-equality test  (P0.4 GO criterion)
//
// WORKFLOW:
//   1. bun run borsh-bytes.ts  (from TxLINE/step1-spike/) writes:
//        proofmarket/golden/validate-stat-args.hex   ← Anchor TS coder bytes
//        proofmarket/golden/validate-stat-args.json  ← concrete arg values
//   2. cargo test -p probe_validate args_match_anchor_coder  → must PASS.
//
// The test loads the JSON sidecar to build the exact same arg values that the
// TS coder used, then asserts byte identity.
// ─────────────────────────────────────────────────────────────────────────────
#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::AnchorSerialize;
    use serde::Deserialize;

    // ── JSON sidecar schema (must match borsh-bytes.ts output shape) ────────

    #[derive(Deserialize, Debug)]
    #[serde(rename_all = "camelCase")]
    struct GoldenJson {
        ts: String,                          // decimal i64
        fixture_summary: GoldenFixtureSummary,
        fixture_proof: Vec<GoldenProofNode>,
        main_tree_proof: Vec<GoldenProofNode>,
        predicate: GoldenPredicate,
        stat_a: GoldenStatTerm,
        // stat_b and op are null → Option::None
    }

    #[derive(Deserialize, Debug)]
    #[serde(rename_all = "camelCase")]
    struct GoldenFixtureSummary {
        fixture_id: String,            // decimal i64
        update_stats: GoldenUpdateStats,
        events_sub_tree_root: Vec<u8>, // 32-element array
    }

    #[derive(Deserialize, Debug)]
    #[serde(rename_all = "camelCase")]
    struct GoldenUpdateStats {
        update_count: i32,
        min_timestamp: String,         // decimal i64
        max_timestamp: String,         // decimal i64
    }

    #[derive(Deserialize, Debug)]
    #[serde(rename_all = "camelCase")]
    struct GoldenProofNode {
        hash: Vec<u8>,                 // 32-element array
        is_right_sibling: bool,
    }

    #[derive(Deserialize, Debug)]
    #[serde(rename_all = "camelCase")]
    struct GoldenPredicate {
        threshold: i32,
        comparison: String,            // e.g. "lessThan"
    }

    #[derive(Deserialize, Debug)]
    #[serde(rename_all = "camelCase")]
    struct GoldenStatTerm {
        stat_to_prove: GoldenScoreStat,
        event_stat_root: Vec<u8>,      // 32-element array
        stat_proof: Vec<GoldenProofNode>,
    }

    #[derive(Deserialize, Debug)]
    #[serde(rename_all = "camelCase")]
    struct GoldenScoreStat {
        key: u32,
        value: i32,
        period: i32,
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    fn to_32(v: &[u8]) -> [u8; 32] {
        assert_eq!(v.len(), 32, "expected 32 bytes, got {}", v.len());
        v.try_into().unwrap()
    }

    fn comparison_from_str(s: &str) -> Comparison {
        match s {
            "greaterThan" => Comparison::GreaterThan,
            "lessThan"    => Comparison::LessThan,
            "equalTo"     => Comparison::EqualTo,
            other => panic!("unknown comparison variant: {}", other),
        }
    }

    fn proof_nodes(nodes: &[GoldenProofNode]) -> Vec<ProofNode> {
        nodes.iter().map(|n| ProofNode {
            hash:             to_32(&n.hash),
            is_right_sibling: n.is_right_sibling,
        }).collect()
    }

    // ── The test ─────────────────────────────────────────────────────────────

    #[test]
    fn args_match_anchor_coder() {
        let json_str = include_str!("../../../golden/validate-stat-args.json");
        let golden: GoldenJson = serde_json::from_str(json_str)
            .expect("failed to parse validate-stat-args.json");

        let args = ValidateStatArgs {
            ts: golden.ts.parse::<i64>().expect("ts parse"),
            fixture_summary: ScoresBatchSummary {
                fixture_id: golden.fixture_summary.fixture_id
                    .parse::<i64>().expect("fixture_id parse"),
                update_stats: ScoresUpdateStats {
                    update_count:  golden.fixture_summary.update_stats.update_count,
                    min_timestamp: golden.fixture_summary.update_stats.min_timestamp
                        .parse::<i64>().expect("min_ts parse"),
                    max_timestamp: golden.fixture_summary.update_stats.max_timestamp
                        .parse::<i64>().expect("max_ts parse"),
                },
                events_sub_tree_root: to_32(&golden.fixture_summary.events_sub_tree_root),
            },
            fixture_proof:   proof_nodes(&golden.fixture_proof),
            main_tree_proof: proof_nodes(&golden.main_tree_proof),
            predicate: TraderPredicate {
                threshold:  golden.predicate.threshold,
                comparison: comparison_from_str(&golden.predicate.comparison),
            },
            stat_a: StatTerm {
                stat_to_prove: ScoreStat {
                    key:    golden.stat_a.stat_to_prove.key,
                    value:  golden.stat_a.stat_to_prove.value,
                    period: golden.stat_a.stat_to_prove.period,
                },
                event_stat_root: to_32(&golden.stat_a.event_stat_root),
                stat_proof:      proof_nodes(&golden.stat_a.stat_proof),
            },
            stat_b: None,
            op:     None,
        };

        let bytes = args.try_to_vec().expect("AnchorSerialize failed");
        let got_hex = hex::encode(&bytes);
        let expected_hex = include_str!("../../../golden/validate-stat-args.hex").trim();

        if got_hex != expected_hex {
            eprintln!(
                "MISMATCH: Rust serialized {} bytes ({} hex chars) vs golden {} hex chars",
                bytes.len(), got_hex.len(), expected_hex.len()
            );
            for (i, (g, e)) in got_hex.chars().zip(expected_hex.chars()).enumerate() {
                if g != e {
                    eprintln!(
                        "  First hex-char diff at index {}: got='{}' expected='{}'  (byte {})",
                        i, g, e, i / 2
                    );
                    break;
                }
            }
            if got_hex.len() != expected_hex.len() {
                eprintln!(
                    "  Length difference: Rust {} chars vs golden {} chars",
                    got_hex.len(), expected_hex.len()
                );
            }
        }

        assert_eq!(
            got_hex, expected_hex,
            "Rust Borsh layout does not match Anchor TS coder bytes"
        );
    }
}
