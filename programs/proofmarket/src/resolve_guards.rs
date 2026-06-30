use anchor_lang::prelude::*;
use crate::constants::TXORACLE_ID;
use crate::errors::ProofError;

/// Day index for the txoracle daily-scores root PDA. Never a silent `as u16` truncation.
/// (Source ts vs min_timestamp locked by Gate G4 — caller passes the G4-correct value.)
pub fn derive_epoch_day(ts: i64) -> Result<u16> {
    u16::try_from(ts / 86_400_000).map_err(|_| error!(ProofError::WrongRootAccount))
}

pub fn expected_root_pda(epoch_day: u16) -> Pubkey {
    Pubkey::find_program_address(&[b"daily_scores_roots", &epoch_day.to_le_bytes()], &TXORACLE_ID).0
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn epoch_day_for_verified_root() {
        let ts = 20634i64 * 86_400_000 + 12_345; // any ms inside epochDay 20634
        assert_eq!(derive_epoch_day(ts).unwrap(), 20634u16);
    }
    #[test] fn epoch_day_overflow_rejected() {
        assert!(derive_epoch_day(70_000i64 * 86_400_000).is_err()); // > u16::MAX days
    }
    #[test] fn root_pda_is_canonical() {
        let want = anchor_lang::prelude::Pubkey::find_program_address(
            &[b"daily_scores_roots", &20634u16.to_le_bytes()], &TXORACLE_ID).0;
        assert_eq!(expected_root_pda(20634), want);
    }
}
