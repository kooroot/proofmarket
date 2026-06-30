use anchor_lang::prelude::*;
use anchor_spl::token::{transfer_checked, Mint, Token, TokenAccount, TransferChecked};
use crate::constants::*;
use crate::errors::ProofError;
use crate::events::Staked;
use crate::state::{Market, Position};

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut, seeds = [b"market", market.market_id.to_le_bytes().as_ref()], bump = market.bump)]
    pub market: Account<'info, Market>,
    #[account(
        init_if_needed, payer = user, space = 8 + Position::INIT_SPACE,
        seeds = [b"position", market.key().as_ref(), user.key().as_ref()], bump
    )]
    pub position: Account<'info, Position>,
    #[account(mut, seeds = [b"vault", market.key().as_ref()], bump = market.vault_bump)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut, token::mint = market.mint, token::authority = user)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(address = market.mint)]
    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Stake>, side: bool, amount: u64) -> Result<()> {
    let now_ms = Clock::get()?.unix_timestamp.checked_mul(1000).ok_or(error!(ProofError::MathOverflow))?;
    require!(ctx.accounts.market.state == ST_OPEN, ProofError::MarketNotOpen);
    require!(now_ms < ctx.accounts.market.resolve_after_ts, ProofError::MarketLocked);
    require!(amount > 0, ProofError::ZeroAmount);
    require!(amount >= MIN_STAKE, ProofError::StakeTooSmall);

    let cpi = TransferChecked {
        from: ctx.accounts.user_token_account.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    transfer_checked(
        CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi),
        amount, ctx.accounts.mint.decimals,
    )?;

    let market = &mut ctx.accounts.market;
    let position = &mut ctx.accounts.position;
    if position.market == Pubkey::default() {
        position.bump = ctx.bumps.position;
        position.market = market.key();
        position.owner = ctx.accounts.user.key();
        market.total_positions = market.total_positions.checked_add(1).ok_or(error!(ProofError::MathOverflow))?;
    }
    if side {
        if position.yes_amount == 0 {
            market.yes_stakers = market.yes_stakers.checked_add(1).ok_or(error!(ProofError::MathOverflow))?;
        }
        position.yes_amount = position.yes_amount.checked_add(amount).ok_or(error!(ProofError::MathOverflow))?;
        market.yes_pool = market.yes_pool.checked_add(amount).ok_or(error!(ProofError::MathOverflow))?;
    } else {
        if position.no_amount == 0 {
            market.no_stakers = market.no_stakers.checked_add(1).ok_or(error!(ProofError::MathOverflow))?;
        }
        position.no_amount = position.no_amount.checked_add(amount).ok_or(error!(ProofError::MathOverflow))?;
        market.no_pool = market.no_pool.checked_add(amount).ok_or(error!(ProofError::MathOverflow))?;
    }

    emit!(Staked {
        market: market.key(), owner: ctx.accounts.user.key(), side, amount,
        yes_pool: market.yes_pool, no_pool: market.no_pool,
    });
    Ok(())
}
