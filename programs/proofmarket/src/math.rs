use anchor_lang::prelude::*;
use crate::errors::ProofError;

pub struct Settlement {
    pub winning_pool: u64,
    pub losing_pool: u64,
    pub fee_amount: u64,
    pub payout_pool: u64,
}

pub fn compute_settlement(yes_pool: u64, no_pool: u64, predicate_true: bool, fee_bps: u16) -> Result<Settlement> {
    let total = yes_pool.checked_add(no_pool).ok_or(error!(ProofError::MathOverflow))?;
    let winning_pool = if predicate_true { yes_pool } else { no_pool };
    let losing_pool = total.checked_sub(winning_pool).ok_or(error!(ProofError::MathOverflow))?;
    let fee_amount = (losing_pool as u128)
        .checked_mul(fee_bps as u128).ok_or(error!(ProofError::MathOverflow))?
        .checked_div(10_000).ok_or(error!(ProofError::MathOverflow))? as u64;
    let net_losing = losing_pool.checked_sub(fee_amount).ok_or(error!(ProofError::MathOverflow))?;
    let payout_pool = winning_pool.checked_add(net_losing).ok_or(error!(ProofError::MathOverflow))?;
    Ok(Settlement { winning_pool, losing_pool, fee_amount, payout_pool })
}

pub fn compute_payout(winning_stake: u64, payout_pool: u64, winning_pool: u64) -> Result<u64> {
    if winning_pool == 0 {
        return Ok(0);
    }
    let payout = (winning_stake as u128)
        .checked_mul(payout_pool as u128).ok_or(error!(ProofError::MathOverflow))?
        / winning_pool as u128;
    Ok(payout as u64)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn even_pools_no_fee() {
        let s = compute_settlement(100, 100, true, 0).unwrap();
        assert_eq!((s.winning_pool, s.losing_pool, s.fee_amount, s.payout_pool), (100, 100, 0, 200));
        assert_eq!(compute_payout(100, s.payout_pool, s.winning_pool).unwrap(), 200);
    }

    #[test]
    fn lopsided_winner_never_short_paid() {
        // yes=950 win, no=50 lose, 10% fee on losers only
        let s = compute_settlement(950, 50, true, 1000).unwrap();
        assert_eq!((s.fee_amount, s.payout_pool), (5, 995)); // floor(50*1000/10000)=5
        let p = compute_payout(950, s.payout_pool, s.winning_pool).unwrap();
        assert_eq!(p, 995);
        assert!(p >= 950); // never net-negative on a winning bet
    }

    #[test]
    fn fee_only_on_losing_side() {
        let s = compute_settlement(100, 900, true, 1000).unwrap();
        assert_eq!((s.fee_amount, s.payout_pool), (90, 910));
        assert_eq!(compute_payout(100, s.payout_pool, s.winning_pool).unwrap(), 910);
    }

    #[test]
    fn dust_stays_in_vault_and_solvent() {
        // 3 winners of 1 (winning_pool=3), losers=10, no fee -> payout_pool=13
        let s = compute_settlement(3, 10, true, 0).unwrap();
        assert_eq!(s.payout_pool, 13);
        let p = compute_payout(1, s.payout_pool, s.winning_pool).unwrap(); // floor(13/3)=4
        assert_eq!(p, 4);
        assert!(3 * p <= s.payout_pool);          // solvency
        assert_eq!(s.payout_pool - 3 * p, 1);     // dust retained
    }

    #[test]
    fn no_side_wins_when_false() {
        let s = compute_settlement(200, 800, false, 500).unwrap();
        assert_eq!((s.winning_pool, s.losing_pool, s.fee_amount), (800, 200, 10));
        assert_eq!(s.payout_pool, 990);
    }

    #[test]
    fn whale_no_u64_overflow() {
        let big = 50_000_000_000u64; // $50k/side at 6dp
        let s = compute_settlement(big, big, true, 1000).unwrap();
        let p = compute_payout(big, s.payout_pool, s.winning_pool).unwrap();
        assert!(p >= big); // u128 intermediate prevents the 4.75e21 product from wrapping
    }

    #[test]
    fn zero_winning_pool_pays_zero() {
        assert_eq!(compute_payout(0, 100, 0).unwrap(), 0);
    }
}
