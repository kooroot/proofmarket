/// probe_validate — P0.4 Borsh layout guard.
///
/// This is a MINIMAL anchor program skeleton so that `anchor build` can compile
/// it and generate an IDL without errors. The program is never deployed in P0.4.
///
/// The real work is in `idl_types.rs`: the seven structs + byte-equality test.
use anchor_lang::prelude::*;

// Placeholder program ID — this program is never deployed in P0.4.
declare_id!("11111111111111111111111111111111");

#[program]
pub mod probe_validate {
    use super::*;
    // No instructions in P0.4 — this program exists only as a host-test harness.
}

pub mod idl_types;
