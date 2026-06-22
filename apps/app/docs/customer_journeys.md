# GoGoCash Customer Journeys spec

This document maps the primary end-to-end customer journeys and visualizes their system interactions using Mermaid sequence diagrams and step descriptions.

---

## 1. Social Login & Session Establishment

This sequence documents how a user authenticates using social entry points (Google/X/Facebook/Telegram) and is matched to an active NextAuth session.

```mermaid
sequenceDiagram
    autonumber
    actor User as Customer
    participant UI as Login Component
    participant FB as Firebase Identity
    participant NA as NextAuth (Credential Provider)
    participant API as GoGoCash Backend API

    User->>UI: Select Social/Telegram Sign-In
    alt Firebase Social Flow
        UI->>FB: Trigger OAuth Popup/Redirect
        FB-->>UI: Return Firebase ID Token (JWT)
        UI->>NA: signIn("firebase", { jwt, pathname, country, ... })
    else Telegram Flow
        User->>UI: Redirect with Telegram Callback params
        UI->>NA: signIn("firebase", { type: "telegram", jwt: tgData, ... })
    end
    NA->>API: POST /auth/log-in or /auth/register
    Note over API: Verifies Firebase JWT<br/>or Telegram payload
    API-->>NA: Return custom app access token + user details
    NA-->>UI: Establish local session (NextAuth JWT strategy)
    UI->>User: Route to Home with session active
```

---

## 2. Payout Method Creation & Selection

Users can add PromptPay, Bank Transfer, or Crypto Wallet payout methods to receive their cashback.

```mermaid
flowchart TD
    Start([User decides to add payout]) --> Menu[Open Payout Settings /method]
    Menu --> Add[Tap 'Add Method']
    Add --> TabSelect{Select Payout Type}

    TabSelect -->|PromptPay| PP[Enter PromptPay code & names<br/>Attach QR screenshot]
    TabSelect -->|Bank Transfer| Bank[Select bank name<br/>Enter Account No & Name]
    TabSelect -->|Crypto Wallet| Crypto[Enter EVM Wallet Address]

    PP --> SavePP[Tap Save Payout]
    Bank --> SaveBank[Tap Save Payout]
    Crypto --> SaveCrypto[Tap Save Payout]

    SavePP --> ValidatePP{Inputs filled?}
    SaveBank --> ValidateBank{Inputs valid & Bank selected?}
    SaveCrypto --> ValidateCrypto{Address filled?}

    ValidatePP -->|No| PP
    ValidateBank -->|No| Bank
    ValidateCrypto -->|No| Crypto

    ValidatePP -->|Yes| PP_API[POST /withdraw/methods]
    ValidateBank -->|Yes| Bank_API[POST /withdraw/methods]
    ValidateCrypto -->|Yes| Crypto_API[POST /withdraw/methods]

    PP_API & Bank_API & Crypto_API --> Success[Success toast & Redirect back]
```

---

## 3. Web3 & Bank Cashback Withdrawal

Once the user has available cashback, they can withdraw it either directly via on-chain smart contracts (Web3) or local bank transfer.

```mermaid
sequenceDiagram
    autonumber
    actor User as Customer
    participant UI as Withdraw Screen
    participant Metamask as EVM Wallet Extension
    participant API as GoGoCash API
    participant Contract as EVM Withdraw Contract

    User->>UI: Enter amount and select withdrawal path
    alt Web3 / On-Chain Withdrawal
        UI->>API: POST /withdraw/signature { amount, chainId }
        API-->>UI: Return payload + cryptographic signature
        UI->>Metamask: Connect & Prompt Withdraw signature
        Metamask-->>UI: Accept and dispatch transaction
        UI->>Contract: execute withdrawCashback(amount, signature)
        Contract-->>UI: Return transaction hash (success)
        UI->>API: POST /withdraw { txHash, chainId, amount }
    else Bank Transfer Withdrawal
        UI->>UI: Select saved Bank Method
        UI->>API: POST /withdraw/bank-transfer { amount, methodId }
    end
    API-->>UI: Complete withdrawal log
    UI->>User: Display success modal and updated balance
```

---

**Related:** Customer app UI theming — [dark-mode.md](./dark-mode.md).
