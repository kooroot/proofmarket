use anchor_lang::prelude::*;

declare_id!("6QNd5mHvV7czVkrRNdLPmuUybSwwdPWq9RYuwk5LZuEb");

#[program]
pub mod proofmarket {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
