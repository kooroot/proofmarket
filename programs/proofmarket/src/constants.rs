use anchor_lang::prelude::*;

/// Minimum stake in base units (6-dp USDC).
pub const MIN_STAKE: u64 = 1_000;
/// Max fee = 10%.
pub const MAX_FEE_BPS: u16 = 1_000;
/// txoracle program we CPI into (devnet).
pub const TXORACLE_ID: Pubkey = pubkey!("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");
/// Legacy-SPL devnet test-USDC mint we control (6 dp). Address from keys/usdc-mint.json.
pub const USDC_MINT: Pubkey = pubkey!("2MYAvDHmZCnWUC4rMVYstLNniiXHuxo2Z7j7czaHA8LT");
/// validate_stat instruction discriminator (devnet.mdx) — raw-invoke fallback.
pub const VALIDATE_STAT_DISC: [u8; 8] = [107, 197, 232, 90, 191, 136, 105, 185];

pub const CMP_GT: u8 = 0;
pub const CMP_LT: u8 = 1;
pub const CMP_EQ: u8 = 2;

pub const ST_OPEN: u8 = 0;
pub const ST_LOCKED: u8 = 1;
pub const ST_RESOLVED: u8 = 2;
pub const ST_VOID: u8 = 3;
pub const ST_CLOSED: u8 = 4;

pub const OUT_UNSET: u8 = 0;
pub const OUT_YES: u8 = 1;
pub const OUT_NO: u8 = 2;

/// Monotone-cumulative ScoreStat.key allowlist.
/// CONTROLLER RESOLUTION of plan line-359 OPEN item, per Phase-0 gate G3:
/// only keys [1,2,7,8] (goals home/away, corners home/away) were EMPIRICALLY confirmed
/// monotone-cumulative across 163+ observed seqs (golden/finality-findings.json). Cards
/// 3-6 (yellows/reds) are semantically monotone but were NOT present in the dev feed, so
/// they stay UNVERIFIED and are DEFERRED from v1 (verify-never-guess). Broaden post-confirmation.
pub const MONOTONE_CUMULATIVE_KEYS: [u32; 4] = [1, 2, 7, 8];
/// Grace before close_market (stretch, P1.S2).
pub const CLOSE_GRACE_MS: i64 = 86_400_000;

pub fn is_monotone_cumulative(key: u32) -> bool {
    MONOTONE_CUMULATIVE_KEYS.contains(&key)
}
