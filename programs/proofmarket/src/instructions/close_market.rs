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
        constraint = market.creator == creator.key() @ ProofError::MarketNotSettled
    )]
    pub market: Account<'info, Market>,
    #[account(mut, seeds = [b"vault", market.key().as_ref()], bump = market.vault_bump)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut, address = market.fee_destination)]
    pub fee_destination: Account<'info, TokenAccount>,
    #[account(address = market.mint)]
    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<CloseMarket>) -> Result<()> {
    require!(
        ctx.accounts.market.state == ST_RESOLVED || ctx.accounts.market.state == ST_VOID,
        ProofError::MarketNotSettled
    );
    let now_ms = Clock::get()?.unix_timestamp.checked_mul(1000).ok_or(error!(ProofError::MathOverflow))?;
    require!(
        now_ms >= ctx.accounts.market.resolved_at.checked_add(CLOSE_GRACE_MS).ok_or(error!(ProofError::MathOverflow))?,
        ProofError::MarketNotSettled
    );

    let market_id_le = ctx.accounts.market.market_id.to_le_bytes();
    let bump = ctx.accounts.market.bump;
    let seeds: &[&[u8]] = &[b"market", market_id_le.as_ref(), core::slice::from_ref(&bump)];
    let signer_seeds: &[&[&[u8]]] = &[seeds];

    // Sweep only fee + dust (whatever remains) to fee_destination.
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
            remaining, ctx.accounts.mint.decimals,
        )?;
    }

    // Vault must be empty before close (defensive — a winner who never claimed would trip this).
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
