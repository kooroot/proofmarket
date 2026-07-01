use anchor_lang::prelude::*;
use anchor_spl::token::{close_account, transfer_checked, CloseAccount, Mint, Token, TokenAccount, TransferChecked};
use crate::constants::*;
use crate::errors::ProofError;
use crate::state::Market;

#[derive(Accounts)]
pub struct CloseMarket<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        mut, close = creator,
        seeds = [b"market", market.market_id.to_le_bytes().as_ref()], bump = market.bump,
        constraint = market.creator == creator.key() @ ProofError::Unauthorized
    )]
    pub market: Account<'info, Market>,
    #[account(
        mut,
        seeds = [b"vault", market.key().as_ref()], bump = market.vault_bump,
        token::mint = market.mint,
        token::authority = market
    )]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut, address = market.fee_destination, token::mint = market.mint)]
    pub fee_destination: Account<'info, TokenAccount>,
    #[account(address = market.mint)]
    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<CloseMarket>) -> Result<()> {
    let state = ctx.accounts.market.state;
    require!(state == ST_RESOLVED || state == ST_VOID, ProofError::MarketNotSettled);

    let now_ms = Clock::get()?.unix_timestamp.checked_mul(1000).ok_or(error!(ProofError::MathOverflow))?;
    require!(
        now_ms
            >= ctx.accounts.market.resolved_at.checked_add(CLOSE_GRACE_MS).ok_or(error!(ProofError::MathOverflow))?,
        ProofError::CloseTooEarly
    );

    // ROOT-CAUSE GUARD: every rightful claimant must have withdrawn BEFORE we sweep the residual,
    // else an unclaimed winner payout (RESOLVED) or unrefunded principal (VOID) would be misdirected
    // to fee_destination. `claims_count` counts winning-side claims (claim.rs bumps it only when
    // payout > 0, and every winner's payout is > 0 since payout_pool >= winning_pool), so it equals
    // the winning-side staker count exactly when all winners have claimed.
    if state == ST_RESOLVED {
        let winner_count = if ctx.accounts.market.outcome == OUT_YES {
            ctx.accounts.market.yes_stakers
        } else {
            ctx.accounts.market.no_stakers
        };
        require!(ctx.accounts.market.claims_count == winner_count, ProofError::VaultNotEmpty);
    } else {
        let total_staked = ctx
            .accounts
            .market
            .yes_pool
            .checked_add(ctx.accounts.market.no_pool)
            .ok_or(error!(ProofError::MathOverflow))?;
        require!(ctx.accounts.market.claimed_amount == total_staked, ProofError::VaultNotEmpty);
    }

    let market_id_le = ctx.accounts.market.market_id.to_le_bytes();
    let bump = ctx.accounts.market.bump;
    let seeds: &[&[u8]] = &[b"market", market_id_le.as_ref(), core::slice::from_ref(&bump)];
    let signer_seeds: &[&[&[u8]]] = &[seeds];

    // Post-guard the vault holds ONLY fee + rounding dust (RESOLVED) or 0 (VOID) — all sweepable.
    let remaining = ctx.accounts.vault.amount;
    if remaining > 0 {
        let cpi = TransferChecked {
            from: ctx.accounts.vault.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.fee_destination.to_account_info(),
            authority: ctx.accounts.market.to_account_info(),
        };
        transfer_checked(
            CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), cpi, signer_seeds),
            remaining,
            ctx.accounts.mint.decimals,
        )?;
    }

    ctx.accounts.vault.reload()?;
    require!(ctx.accounts.vault.amount == 0, ProofError::VaultNotEmpty);
    let cpi = CloseAccount {
        account: ctx.accounts.vault.to_account_info(),
        destination: ctx.accounts.creator.to_account_info(),
        authority: ctx.accounts.market.to_account_info(),
    };
    close_account(CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), cpi, signer_seeds))?;
    // Anchor `close = creator` on `market` reclaims the Market rent.
    Ok(())
}
