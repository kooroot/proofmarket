use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::{get_return_data, invoke},
};
use crate::constants::*;
use crate::errors::ProofError;
use crate::events::{MarketResolved, MarketVoided};
use crate::math::compute_settlement;
use crate::resolve_guards::{derive_epoch_day, expected_root_pda};
use crate::state::Market;
use crate::txoracle_types::*;

fn oracle_comparison(c: u8) -> Result<Comparison> {
    Ok(match c {
        0 => Comparison::GreaterThan,
        1 => Comparison::LessThan,
        2 => Comparison::EqualTo,
        _ => return err!(ProofError::PredicateMismatch),
    })
}

#[derive(Accounts)]
pub struct Resolve<'info> {
    #[account(mut)]
    pub resolver: Signer<'info>,
    #[account(mut, seeds = [b"market", market.market_id.to_le_bytes().as_ref()], bump = market.bump)]
    pub market: Account<'info, Market>,
    /// CHECK: validated against the derived PDA + txoracle owner in handler step 3.
    pub daily_scores_merkle_roots: UncheckedAccount<'info>,
    /// CHECK: pinned by address; the validate_stat callee program.
    #[account(address = TXORACLE_ID)]
    pub txoracle_program: UncheckedAccount<'info>,
}

pub fn handler(
    ctx: Context<Resolve>,
    ts: i64,
    fixture_summary: ScoresBatchSummary,
    fixture_proof: Vec<ProofNode>,
    main_tree_proof: Vec<ProofNode>,
    stat_a: StatTerm,
    stat_b: Option<StatTerm>,
) -> Result<()> {
    // 1. State/time gate.
    require!(
        ctx.accounts.market.state == ST_OPEN || ctx.accounts.market.state == ST_LOCKED,
        ProofError::InvalidState
    );
    let now_ms = Clock::get()?.unix_timestamp.checked_mul(1000).ok_or(error!(ProofError::MathOverflow))?;
    require!(now_ms >= ctx.accounts.market.resolve_after_ts, ProofError::ResolveTooEarly);

    // 2. One-sided guard -> Void (no opposing pool to pay out).
    if ctx.accounts.market.yes_pool == 0 || ctx.accounts.market.no_pool == 0 {
        let market = &mut ctx.accounts.market;
        market.state = ST_VOID;
        market.resolved_at = now_ms;
        emit!(MarketVoided { market: market.key() });
        return Ok(());
    }

    // 3. Pin the root account to the correct day (PDA + txoracle ownership).
    let epoch_day = derive_epoch_day(ts)?;
    require_keys_eq!(
        ctx.accounts.daily_scores_merkle_roots.key(), expected_root_pda(epoch_day),
        ProofError::WrongRootAccount
    );
    require!(ctx.accounts.daily_scores_merkle_roots.owner == &TXORACLE_ID, ProofError::WrongRootAccount);

    // 4. Bind the proof to the committed market.
    require!(fixture_summary.fixture_id == ctx.accounts.market.fixture_id, ProofError::FixtureMismatch);
    require!(
        stat_a.stat_to_prove.key == ctx.accounts.market.stat_a_key
            && stat_a.stat_to_prove.period == ctx.accounts.market.stat_a_period,
        ProofError::PredicateMismatch
    );
    require!(stat_b.is_none(), ProofError::UnexpectedSecondStat);

    // 5. Finality binding (G3 boundary): the proven batch must be at/after the lock time.
    require!(
        fixture_summary.update_stats.max_timestamp >= ctx.accounts.market.resolve_after_ts,
        ProofError::StaleFinalBatch
    );

    // 6. Rebuild predicate from STORAGE (never trust the caller).
    let predicate = TraderPredicate {
        threshold: ctx.accounts.market.threshold,
        comparison: oracle_comparison(ctx.accounts.market.comparison)?,
    };
    let op: Option<BinaryExpression> = None;

    // Capture Copy receipt values BEFORE moving stat_a/fixture_summary into the CPI args.
    let proven_value = stat_a.stat_to_prove.value;
    let event_stat_root = stat_a.event_stat_root;
    let events_sub_tree_root = fixture_summary.events_sub_tree_root;
    let root_key = ctx.accounts.daily_scores_merkle_roots.key();

    // 7. CPI validate_stat — RAW invoke (declare_program! unusable on this IDL in 0.31.1; G1/P0.5-proven path).
    let args = ValidateStatArgs {
        ts, fixture_summary, fixture_proof, main_tree_proof, predicate, stat_a, stat_b, op,
    };
    let mut data = VALIDATE_STAT_DISC.to_vec();
    data.extend_from_slice(&args.try_to_vec().map_err(|_| error!(ProofError::SerializationFailed))?);
    let ix = Instruction {
        program_id: TXORACLE_ID,
        accounts: vec![AccountMeta::new_readonly(root_key, false)],
        data,
    };
    invoke(
        &ix,
        &[
            ctx.accounts.daily_scores_merkle_roots.to_account_info(),
            ctx.accounts.txoracle_program.to_account_info(),
        ],
    )?;
    // Read return data IMMEDIATELY — must be the very next statement after invoke.
    let (rp, ret) = get_return_data().ok_or(error!(ProofError::NoReturnData))?;
    require!(rp == TXORACLE_ID, ProofError::WrongOracleProgram);
    let predicate_true = match ret.as_slice() {
        [1] => true,
        [0] => false,
        _ => return err!(ProofError::BadReturnData),
    };

    // 8. Settlement math (fee on losing pool) + record proven value & receipt fields.
    let s = compute_settlement(
        ctx.accounts.market.yes_pool, ctx.accounts.market.no_pool, predicate_true, ctx.accounts.market.fee_bps,
    )?;
    let market = &mut ctx.accounts.market;
    market.proven_value_a = proven_value;
    market.daily_root = root_key;
    market.epoch_day = epoch_day;
    market.event_stat_root = event_stat_root;
    market.events_sub_tree_root = events_sub_tree_root;
    market.resolve_ts = ts;

    // 9. Settle. No fund movement — winners pull via claim (P1.13).
    market.outcome = if predicate_true { OUT_YES } else { OUT_NO };
    market.winning_pool = s.winning_pool;
    market.fee_amount = s.fee_amount;
    market.payout_pool = s.payout_pool;
    market.resolved_at = now_ms;
    market.state = ST_RESOLVED;

    // 10. Emit the self-authenticating receipt.
    emit!(MarketResolved {
        market: market.key(), fixture_id: market.fixture_id,
        stat_a_key: market.stat_a_key, stat_a_period: market.stat_a_period,
        proven_value_a: market.proven_value_a, proven_value_b: None,
        threshold: market.threshold, comparison: market.comparison, op: None,
        predicate_true, outcome: market.outcome,
        daily_root: market.daily_root, epoch_day: market.epoch_day,
        event_stat_root: market.event_stat_root, events_sub_tree_root: market.events_sub_tree_root,
        resolve_ts: market.resolve_ts,
        yes_pool: market.yes_pool, no_pool: market.no_pool,
        fee_amount: market.fee_amount, payout_pool: market.payout_pool, winning_pool: market.winning_pool,
        resolver: ctx.accounts.resolver.key(),
    });
    Ok(())
}
