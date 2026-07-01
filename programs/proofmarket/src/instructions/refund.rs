use anchor_lang::prelude::*;
use anchor_spl::token::{transfer_checked, Mint, Token, TokenAccount, TransferChecked};
use crate::constants::*;
use crate::errors::ProofError;
use crate::events::Claimed;
use crate::state::{Market, Position};

#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut, seeds = [b"market", market.market_id.to_le_bytes().as_ref()], bump = market.bump)]
    pub market: Account<'info, Market>,
    #[account(
        mut,
        seeds = [b"position", market.key().as_ref(), user.key().as_ref()],
        bump = position.bump, has_one = market, close = user
    )]
    pub position: Account<'info, Position>,
    #[account(
        mut,
        seeds = [b"vault", market.key().as_ref()], bump = market.vault_bump,
        token::mint = market.mint,
        token::authority = market
    )]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut, token::mint = market.mint, token::authority = user)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(address = market.mint)]
    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<Refund>) -> Result<()> {
    require!(ctx.accounts.market.state == ST_VOID, ProofError::NotVoid);
    // Belt-and-suspenders: `close = user` already prevents a replay (the 2nd call fails at
    // account deserialization), so this flag is defensive — it documents intent and guards
    // against a future change that drops `close = user`.
    require!(!ctx.accounts.position.claimed, ProofError::AlreadyClaimed);
    let refund = ctx.accounts.position.yes_amount
        .checked_add(ctx.accounts.position.no_amount).ok_or(error!(ProofError::MathOverflow))?;
    require!(refund > 0, ProofError::ZeroAmount);

    ctx.accounts.position.claimed = true;
    ctx.accounts.market.claimed_amount =
        ctx.accounts.market.claimed_amount.checked_add(refund).ok_or(error!(ProofError::MathOverflow))?;

    let market_id_le = ctx.accounts.market.market_id.to_le_bytes();
    let bump = ctx.accounts.market.bump;
    let seeds: &[&[u8]] = &[b"market", market_id_le.as_ref(), core::slice::from_ref(&bump)];
    let signer_seeds: &[&[&[u8]]] = &[seeds];
    let decimals = ctx.accounts.mint.decimals;
    let cpi = TransferChecked {
        from: ctx.accounts.vault.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.user_token_account.to_account_info(),
        authority: ctx.accounts.market.to_account_info(),
    };
    transfer_checked(
        CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), cpi, signer_seeds),
        refund, decimals,
    )?;

    emit!(Claimed { market: ctx.accounts.market.key(), owner: ctx.accounts.user.key(), payout: refund });
    Ok(())
}
