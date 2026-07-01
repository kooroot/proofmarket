/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/proofmarket.json`.
 */
export type Proofmarket = {
  "address": "6QNd5mHvV7czVkrRNdLPmuUybSwwdPWq9RYuwk5LZuEb",
  "metadata": {
    "name": "proofmarket",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "claim",
      "discriminator": [
        62,
        198,
        214,
        193,
        213,
        159,
        108,
        210
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.market_id",
                "account": "market"
              }
            ]
          },
          "relations": [
            "position"
          ]
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "mint"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "createMarket",
      "discriminator": [
        103,
        226,
        97,
        235,
        200,
        188,
        251,
        254
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "marketId"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "feeDestination"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "marketId",
          "type": "u64"
        },
        {
          "name": "fixtureId",
          "type": "i64"
        },
        {
          "name": "statAKey",
          "type": "u32"
        },
        {
          "name": "statAPeriod",
          "type": "i32"
        },
        {
          "name": "threshold",
          "type": "i32"
        },
        {
          "name": "comparison",
          "type": "u8"
        },
        {
          "name": "resolveAfterTsMs",
          "type": "i64"
        },
        {
          "name": "feeBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "refund",
      "discriminator": [
        2,
        96,
        183,
        251,
        63,
        208,
        46,
        46
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.market_id",
                "account": "market"
              }
            ]
          },
          "relations": [
            "position"
          ]
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "mint"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "resolve",
      "discriminator": [
        246,
        150,
        236,
        206,
        108,
        63,
        58,
        10
      ],
      "accounts": [
        {
          "name": "resolver",
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.market_id",
                "account": "market"
              }
            ]
          }
        },
        {
          "name": "dailyScoresMerkleRoots"
        },
        {
          "name": "txoracleProgram",
          "address": "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J"
        }
      ],
      "args": [
        {
          "name": "ts",
          "type": "i64"
        },
        {
          "name": "fixtureSummary",
          "type": {
            "defined": {
              "name": "scoresBatchSummary"
            }
          }
        },
        {
          "name": "fixtureProof",
          "type": {
            "vec": {
              "defined": {
                "name": "proofNode"
              }
            }
          }
        },
        {
          "name": "mainTreeProof",
          "type": {
            "vec": {
              "defined": {
                "name": "proofNode"
              }
            }
          }
        },
        {
          "name": "statA",
          "type": {
            "defined": {
              "name": "statTerm"
            }
          }
        },
        {
          "name": "statB",
          "type": {
            "option": {
              "defined": {
                "name": "statTerm"
              }
            }
          }
        }
      ]
    },
    {
      "name": "stake",
      "discriminator": [
        206,
        176,
        202,
        18,
        200,
        209,
        179,
        108
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.market_id",
                "account": "market"
              }
            ]
          }
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "mint"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "side",
          "type": "bool"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "market",
      "discriminator": [
        219,
        190,
        213,
        55,
        0,
        227,
        198,
        154
      ]
    },
    {
      "name": "position",
      "discriminator": [
        170,
        188,
        143,
        228,
        122,
        64,
        247,
        208
      ]
    }
  ],
  "events": [
    {
      "name": "claimed",
      "discriminator": [
        217,
        192,
        123,
        72,
        108,
        150,
        248,
        33
      ]
    },
    {
      "name": "marketCreated",
      "discriminator": [
        88,
        184,
        130,
        231,
        226,
        84,
        6,
        58
      ]
    },
    {
      "name": "marketResolved",
      "discriminator": [
        89,
        67,
        230,
        95,
        143,
        106,
        199,
        202
      ]
    },
    {
      "name": "marketVoided",
      "discriminator": [
        217,
        12,
        138,
        39,
        108,
        75,
        89,
        26
      ]
    },
    {
      "name": "staked",
      "discriminator": [
        11,
        146,
        45,
        205,
        230,
        58,
        213,
        240
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "marketNotOpen",
      "msg": "market is not open"
    },
    {
      "code": 6001,
      "name": "marketLocked",
      "msg": "market is locked"
    },
    {
      "code": 6002,
      "name": "zeroAmount",
      "msg": "amount is zero"
    },
    {
      "code": 6003,
      "name": "stakeTooSmall",
      "msg": "stake below minimum"
    },
    {
      "code": 6004,
      "name": "feeTooHigh",
      "msg": "fee_bps exceeds maximum"
    },
    {
      "code": 6005,
      "name": "unsupportedPredicate",
      "msg": "predicate not supported in v1"
    },
    {
      "code": 6006,
      "name": "resolveTooEarly",
      "msg": "resolve before resolve_after_ts"
    },
    {
      "code": 6007,
      "name": "invalidState",
      "msg": "invalid market state"
    },
    {
      "code": 6008,
      "name": "wrongRootAccount",
      "msg": "wrong daily-scores root account"
    },
    {
      "code": 6009,
      "name": "fixtureMismatch",
      "msg": "fixture id mismatch"
    },
    {
      "code": 6010,
      "name": "predicateMismatch",
      "msg": "predicate stat mismatch"
    },
    {
      "code": 6011,
      "name": "unexpectedSecondStat",
      "msg": "unexpected second stat"
    },
    {
      "code": 6012,
      "name": "staleFinalBatch",
      "msg": "final batch is stale"
    },
    {
      "code": 6013,
      "name": "wrongOracleProgram",
      "msg": "wrong oracle program"
    },
    {
      "code": 6014,
      "name": "noReturnData",
      "msg": "no return data"
    },
    {
      "code": 6015,
      "name": "badReturnData",
      "msg": "bad return data"
    },
    {
      "code": 6016,
      "name": "mathOverflow",
      "msg": "math overflow"
    },
    {
      "code": 6017,
      "name": "notClaimable",
      "msg": "not claimable"
    },
    {
      "code": 6018,
      "name": "alreadyClaimed",
      "msg": "already claimed"
    },
    {
      "code": 6019,
      "name": "notVoid",
      "msg": "market is not void"
    },
    {
      "code": 6020,
      "name": "marketNotSettled",
      "msg": "market is not settled"
    },
    {
      "code": 6021,
      "name": "vaultNotEmpty",
      "msg": "vault is not empty"
    },
    {
      "code": 6022,
      "name": "serializationFailed",
      "msg": "failed to serialize CPI args"
    }
  ],
  "types": [
    {
      "name": "claimed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "payout",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "market",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "vaultBump",
            "type": "u8"
          },
          {
            "name": "marketId",
            "type": "u64"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "fixtureId",
            "type": "i64"
          },
          {
            "name": "feeDestination",
            "type": "pubkey"
          },
          {
            "name": "statAKey",
            "type": "u32"
          },
          {
            "name": "statAPeriod",
            "type": "i32"
          },
          {
            "name": "statBKey",
            "type": {
              "option": "u32"
            }
          },
          {
            "name": "statBPeriod",
            "type": {
              "option": "i32"
            }
          },
          {
            "name": "op",
            "type": {
              "option": "u8"
            }
          },
          {
            "name": "threshold",
            "type": "i32"
          },
          {
            "name": "comparison",
            "type": "u8"
          },
          {
            "name": "resolveAfterTs",
            "type": "i64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "resolvedAt",
            "type": "i64"
          },
          {
            "name": "state",
            "type": "u8"
          },
          {
            "name": "outcome",
            "type": "u8"
          },
          {
            "name": "yesPool",
            "type": "u64"
          },
          {
            "name": "noPool",
            "type": "u64"
          },
          {
            "name": "yesStakers",
            "type": "u32"
          },
          {
            "name": "noStakers",
            "type": "u32"
          },
          {
            "name": "totalPositions",
            "type": "u32"
          },
          {
            "name": "feeBps",
            "type": "u16"
          },
          {
            "name": "feeAmount",
            "type": "u64"
          },
          {
            "name": "payoutPool",
            "type": "u64"
          },
          {
            "name": "winningPool",
            "type": "u64"
          },
          {
            "name": "claimedAmount",
            "type": "u64"
          },
          {
            "name": "claimsCount",
            "type": "u32"
          },
          {
            "name": "provenValueA",
            "type": "i32"
          },
          {
            "name": "provenValueB",
            "type": {
              "option": "i32"
            }
          },
          {
            "name": "dailyRoot",
            "type": "pubkey"
          },
          {
            "name": "epochDay",
            "type": "u16"
          },
          {
            "name": "eventStatRoot",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "eventsSubTreeRoot",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "resolveTs",
            "type": "i64"
          },
          {
            "name": "reserve",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          }
        ]
      }
    },
    {
      "name": "marketCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "marketId",
            "type": "u64"
          },
          {
            "name": "fixtureId",
            "type": "i64"
          },
          {
            "name": "statAKey",
            "type": "u32"
          },
          {
            "name": "statAPeriod",
            "type": "i32"
          },
          {
            "name": "threshold",
            "type": "i32"
          },
          {
            "name": "comparison",
            "type": "u8"
          },
          {
            "name": "resolveAfterTs",
            "type": "i64"
          },
          {
            "name": "feeBps",
            "type": "u16"
          },
          {
            "name": "creator",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "marketResolved",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "fixtureId",
            "type": "i64"
          },
          {
            "name": "statAKey",
            "type": "u32"
          },
          {
            "name": "statAPeriod",
            "type": "i32"
          },
          {
            "name": "provenValueA",
            "type": "i32"
          },
          {
            "name": "provenValueB",
            "type": {
              "option": "i32"
            }
          },
          {
            "name": "threshold",
            "type": "i32"
          },
          {
            "name": "comparison",
            "type": "u8"
          },
          {
            "name": "op",
            "type": {
              "option": "u8"
            }
          },
          {
            "name": "predicateTrue",
            "type": "bool"
          },
          {
            "name": "outcome",
            "type": "u8"
          },
          {
            "name": "dailyRoot",
            "type": "pubkey"
          },
          {
            "name": "epochDay",
            "type": "u16"
          },
          {
            "name": "eventStatRoot",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "eventsSubTreeRoot",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "resolveTs",
            "type": "i64"
          },
          {
            "name": "yesPool",
            "type": "u64"
          },
          {
            "name": "noPool",
            "type": "u64"
          },
          {
            "name": "feeAmount",
            "type": "u64"
          },
          {
            "name": "payoutPool",
            "type": "u64"
          },
          {
            "name": "winningPool",
            "type": "u64"
          },
          {
            "name": "resolver",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "marketVoided",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "position",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "yesAmount",
            "type": "u64"
          },
          {
            "name": "noAmount",
            "type": "u64"
          },
          {
            "name": "claimed",
            "type": "bool"
          },
          {
            "name": "reserve",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          }
        ]
      }
    },
    {
      "name": "proofNode",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "hash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "isRightSibling",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "scoreStat",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "key",
            "type": "u32"
          },
          {
            "name": "value",
            "type": "i32"
          },
          {
            "name": "period",
            "type": "i32"
          }
        ]
      }
    },
    {
      "name": "scoresBatchSummary",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "fixtureId",
            "type": "i64"
          },
          {
            "name": "updateStats",
            "type": {
              "defined": {
                "name": "scoresUpdateStats"
              }
            }
          },
          {
            "name": "eventsSubTreeRoot",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "scoresUpdateStats",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "updateCount",
            "type": "i32"
          },
          {
            "name": "minTimestamp",
            "type": "i64"
          },
          {
            "name": "maxTimestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "staked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "side",
            "type": "bool"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "yesPool",
            "type": "u64"
          },
          {
            "name": "noPool",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "statTerm",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "statToProve",
            "type": {
              "defined": {
                "name": "scoreStat"
              }
            }
          },
          {
            "name": "eventStatRoot",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "statProof",
            "type": {
              "vec": {
                "defined": {
                  "name": "proofNode"
                }
              }
            }
          }
        ]
      }
    }
  ]
};
