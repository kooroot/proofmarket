/// probe_validate — P0.5 G1 throwaway probe program.
///
/// Implements a single `probe` instruction that:
///   1. Accepts the same args as txoracle::validate_stat
///   2. Serializes them with the validate_stat discriminator
///   3. Issues a raw `invoke` to the txoracle program
///   4. Reads the return data immediately via `get_return_data`
///   5. Logs `PROBE_BOOL=1` or `PROBE_BOOL=0`
///
/// CPI path: raw-invoke-fallback (spec §2.3 step 3 / P0.5 step 3).
/// Reason: `declare_program!(txoracle)` codegen is risky with nested
/// Vec<ProofNode>/Option<StatTerm> in Anchor 0.31.1 (spec known risk §P0.5).
/// The P0.4 byte-equality guard proved our Borsh layout is identical to the
/// Anchor TS coder, so raw-invoke is safe.
use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::{get_return_data, invoke},
};

declare_id!("2aEdjbQjBAFE8wNyaF6JWuYWSfVaww4BsZotoGBNfa1b");

pub mod idl_types;
use idl_types::*;

// validate_stat discriminator = sha256("global:validate_stat")[0..8]
const VALIDATE_STAT_DISC: [u8; 8] = [107, 197, 232, 90, 191, 136, 105, 185];
// Frozen txoracle program ID (devnet)
const TXORACLE_ID: Pubkey = pubkey!("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");

#[program]
pub mod probe_validate {
    use super::*;

    /// CPI into txoracle::validate_stat and log PROBE_BOOL={0|1}.
    ///
    /// Accounts:
    ///   0. daily_scores_merkle_roots — txoracle's daily root PDA (read-only)
    ///   1. txoracle_program           — the txoracle program account
    pub fn probe(
        ctx: Context<Probe>,
        ts: i64,
        fixture_summary: ScoresBatchSummary,
        fixture_proof: Vec<ProofNode>,
        main_tree_proof: Vec<ProofNode>,
        predicate: TraderPredicate,
        stat_a: StatTerm,
        stat_b: Option<StatTerm>,
        op: Option<BinaryExpression>,
    ) -> Result<()> {
        let roots = &ctx.accounts.daily_scores_merkle_roots;
        let txoracle_program = &ctx.accounts.txoracle_program;

        // Build instruction data: discriminator ++ Borsh-serialized args
        let args = ValidateStatArgs {
            ts,
            fixture_summary,
            fixture_proof,
            main_tree_proof,
            predicate,
            stat_a,
            stat_b,
            op,
        };
        let args_bytes = args
            .try_to_vec()
            .map_err(|_| error!(ProbeError::SerializationFailed))?;

        let mut data = VALIDATE_STAT_DISC.to_vec();
        data.extend_from_slice(&args_bytes);

        let ix = Instruction {
            program_id: TXORACLE_ID,
            accounts: vec![AccountMeta::new_readonly(*roots.key, false)],
            data,
        };

        // CPI: invoke txoracle (pass only the account infos we actually own)
        invoke(&ix, &[roots.to_account_info(), txoracle_program.to_account_info()])?;

        // Read return data IMMEDIATELY — must be the very next statement after invoke
        let (rp, ret) =
            get_return_data().ok_or_else(|| error!(ProbeError::NoReturnData))?;
        require_keys_eq!(rp, TXORACLE_ID, ProbeError::WrongReturnProgram);
        require!(ret.len() == 1, ProbeError::MalformedReturnData);

        let outcome = ret[0] == 1;
        msg!("PROBE_BOOL={}", outcome as u8);

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Probe<'info> {
    /// CHECK: daily_scores_merkle_roots — txoracle's daily root PDA (read-only, no ownership check)
    pub daily_scores_merkle_roots: AccountInfo<'info>,
    /// CHECK: txoracle_program — the txoracle executable (passed so runtime resolves the program)
    pub txoracle_program: AccountInfo<'info>,
}

#[error_code]
pub enum ProbeError {
    #[msg("Failed to Borsh-serialize ValidateStatArgs")]
    SerializationFailed,
    #[msg("txoracle returned no return data (get_return_data() = None)")]
    NoReturnData,
    #[msg("Return data came from wrong program — expected txoracle")]
    WrongReturnProgram,
    #[msg("Return data payload is not exactly 1 byte")]
    MalformedReturnData,
}
