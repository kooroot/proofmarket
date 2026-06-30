use anchor_lang::prelude::*;

declare_id!("6QNd5mHvV7czVkrRNdLPmuUybSwwdPWq9RYuwk5LZuEb");

pub mod constants;
pub mod errors;
pub mod events;
pub mod state;
pub mod math;
pub mod instructions;

#[program]
pub mod proofmarket {}
