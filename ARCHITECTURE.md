# Base MCP Server - Architecture Overview

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         MCP CLIENT                               │
│                    (Claude Desktop, Cursor)                      │
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │ User Query │→ │ AI Analysis│→ │Tool Select │                │
│  └────────────┘  └────────────┘  └────────────┘                │
└──────────────────────────┬──────────────────────────────────────┘
                           │ MCP Protocol
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                    BASE MCP SERVER (NEXUS)                       │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              AgentKit Integration                       │    │
│  │  • Wallet Provider (CDP)                               │    │
│  │  • Network Configuration                               │    │
│  │  • Action Provider Registry                            │    │
│  └────────────────────────────────────────────────────────┘    │
│                           ↓                                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              Tool Handler & Router                      │    │
│  │  • Request validation                                  │    │
│  │  • Agent selection                                     │    │
│  │  • Execution coordination                              │    │
│  └────────────────────────────────────────────────────────┘    │
│                           ↓                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  AGENT LAYER                             │   │
│  │                                                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │   │
│  │  │ Wallet Agent │  │ ERC20 Agent  │  │  NFT Agent   │ │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │   │
│  │                                                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │   │
│  │  │Contract Agent│  │ Morpho Agent │  │Portfolio Agent│ │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │   │
│  │                                                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │   │
│  │  │ Swap Agent   │  │ Onramp Agent │  │OpenRouter Agt│ │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │   │
│  │                                                          │   │
│  │  ┌──────────────┐  ┌──────────────┐                    │   │
│  │  │Farcaster Agt │  │ CDP API Agent│                    │   │
│  │  └──────────────┘  └──────────────┘                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           ↓                                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │          REST API (Trading Bot Integration)             │    │
│  │            POST /api/trading-bot/report                 │    │
│  │                  (Port 4000)                            │    │
│  └────────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                    BLOCKCHAIN LAYER                              │
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │Base Network│  │   Morpho   │  │   DEXes    │                │
│  └────────────┘  └────────────┘  └────────────┘                │
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │Smart Contract│ │  ERC20     │  │   NFTs     │                │
│  └────────────┘  └────────────┘  └────────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

## The Nexus Pattern

The MCP Server acts as a **nexus** (central coordination point) where:

1. **Agent Registration**: All agents register their capabilities at startup
2. **Tool Discovery**: Clients can discover what tools are available
3. **Request Routing**: Incoming requests are routed to the appropriate agent
4. **Response Coordination**: Results are formatted and returned to the client

### How Agents Are Selected

The agent selection process follows this flow:

```
1. User Request
   ↓
2. AI Client Analyzes Intent
   ↓
3. AI Client Selects Appropriate Tool(s)
   ↓
4. MCP Server Receives Tool Call Request
   ↓
5. Server Routes to Registered Action Provider
   ↓
6. Agent Executes Action
   ↓
7. Result Returned to Client
   ↓
8. AI Client Formats Response for User
```

**Key Point**: The AI client (Claude/Cursor) makes the tool selection decision based on:
- Natural language understanding of the user's intent
- Available tool descriptions and schemas
- Conversation context and history

## Agent Specializations

Each agent is a specialized action provider with specific capabilities:

### Core Infrastructure Agents
- **CDP Wallet Provider**: Manages wallet creation and network configuration
- **Wallet Agent**: Basic wallet operations (address, balance, transfer)
- **CDP API Agent**: Coinbase API integration for advanced operations

### Financial Agents
- **ERC20 Agent**: Token balance checks and transfers
- **Swap Agent**: Token swapping via DEX aggregators
- **Portfolio Agent**: Portfolio tracking and analysis
- **Morpho Agent**: DeFi lending and borrowing

### Asset Management Agents
- **NFT Agent**: NFT listing, transfer, and metadata queries
- **Smart Contract Agent**: Deploy and interact with arbitrary contracts

### Integration Agents
- **Onramp Agent**: Fiat-to-crypto conversion links
- **OpenRouter Agent**: AI credits purchase with USDC
- **Farcaster Agent**: Social identity resolution
- **Basename Agent**: Base naming service

## Decision-Making Process

### Current Implementation: AI-Driven Selection

The current system uses AI-driven tool selection:

```typescript
// Claude analyzes: "Show me my portfolio"
// Claude determines: Need get_portfolio tool
// Claude calls: get_portfolio()
// Server routes to: Portfolio Agent
// Agent executes: Queries balances, calculates values
// Returns: Portfolio data
// Claude formats: User-friendly presentation
```

### Future: Multi-Agent Consensus (Proposed)

For complex operations requiring multiple agents:

```typescript
interface ConsensusRequest {
  operation: string;
  context: object;
  requiredAgents: string[];
}

interface AgentVote {
  agentId: string;
  recommendation: string;
  confidence: number;
  reasoning: string;
}

async function getConsensus(request: ConsensusRequest): Promise<Decision> {
  // 1. Query relevant agents
  const votes = await Promise.all(
    request.requiredAgents.map(agentId => 
      agents[agentId].analyze(request)
    )
  );
  
  // 2. Weight votes by confidence and expertise
  const weightedVotes = votes.map(vote => ({
    ...vote,
    weight: vote.confidence * agentExpertise[vote.agentId]
  }));
  
  // 3. Calculate consensus
  const decision = calculateConsensus(weightedVotes);
  
  // 4. Execute via Apex Agent
  return decision;
}
```

## Apex Agent (Proposed)

The **Apex Agent** is a meta-agent for complex multi-step operations:

### Responsibilities

1. **Strategy Coordination**: Orchestrate multiple agents
2. **Risk Management**: Validate operations against risk parameters
3. **Trade Execution**: Execute multi-step trading strategies
4. **Portfolio Rebalancing**: Coordinate portfolio adjustments

### Example: Portfolio Rebalancing

```typescript
// User: "Rebalance my portfolio to 60% ETH, 40% stablecoins"

// Apex Agent coordinates:
1. Portfolio Agent → Get current holdings
2. Risk Agent → Validate target allocation
3. Swap Agent → Calculate required swaps
4. Risk Agent → Validate slippage limits
5. Wallet Agent → Check gas requirements
6. Swap Agent → Execute trades in optimal order
7. Portfolio Agent → Verify final allocation
8. Return → Summary of operations
```

## Portfolio Parsing and Monitoring

### Current Implementation

The system includes:

1. **Portfolio Agent**: Real-time balance tracking
   - Queries native token balance (ETH)
   - Checks common ERC20 tokens (USDC, DAI, etc.)
   - Calculates USD values
   - Computes allocation percentages

2. **Portfolio Analysis**: 
   - Total portfolio value
   - Asset count
   - Largest position identification
   - Diversification score calculation

3. **REST API Endpoint**: 
   - `POST /api/trading-bot/report`
   - Receives portfolio updates from external bots
   - Port 4000

### Data Flow

```typescript
// Portfolio Query Flow
User → "Show my portfolio" 
  → AI selects get_portfolio tool
    → Portfolio Agent queries:
      → Native balance (ETH)
      → ERC20 balances (USDC, DAI, etc.)
      → Calculate USD values
      → Compute percentages
    → Returns formatted portfolio
  → AI presents to user
```

## Multi-Agent Workflows

### Example 1: Complex DeFi Operation

```
User: "Put 50% of my USDC into the best Morpho vault"

Workflow:
1. Portfolio Agent → Get USDC balance
2. Morpho Agent → Get available vaults and APYs
3. Morpho Agent → Identify best vault
4. Risk Agent (future) → Validate operation
5. ERC20 Agent → Approve Morpho contract
6. Morpho Agent → Supply to vault
7. Portfolio Agent → Verify new position
```

### Example 2: Social Payment

```
User: "Send 10 USDC to @vitalik on Farcaster"

Workflow:
1. Farcaster Agent → Resolve @vitalik to address
2. Portfolio Agent → Verify USDC balance
3. ERC20 Agent → Transfer USDC to resolved address
4. Return transaction hash
```

## Security Architecture

### Multi-Layer Security

```
┌─────────────────────────────────────────┐
│         User Confirmation                │ (Claude UI)
├─────────────────────────────────────────┤
│         Input Validation                 │ (Zod schemas)
├─────────────────────────────────────────┤
│         Address Validation               │ (viem checks)
├─────────────────────────────────────────┤
│         Transaction Simulation (future)  │
├─────────────────────────────────────────┤
│         Rate Limiting (future)           │
├─────────────────────────────────────────┤
│         Multi-sig (future)               │
└─────────────────────────────────────────┘
```

### Current Security Measures

1. **Environment Variable Protection**: No hardcoded secrets
2. **Type Safety**: TypeScript for compile-time checking
3. **Input Validation**: Zod schemas for all tool inputs
4. **Address Validation**: viem's address checking
5. **Error Handling**: No sensitive data in error messages

## Performance Considerations

### Optimization Strategies

1. **Async Operations**: All blockchain calls are async
2. **Concurrent Queries**: Multiple balance checks in parallel
3. **Efficient ABIs**: Minimal contract interface definitions
4. **Connection Reuse**: Single wallet provider instance

### Future Enhancements

1. **Caching**: Cache token metadata and prices
2. **Connection Pooling**: RPC endpoint pool
3. **Request Batching**: Batch multiple contract reads
4. **Lazy Loading**: Load agents on-demand

## Extensibility

### Adding New Agents

To add a new agent:

1. Create `src/tools/[agent-name]/index.ts`
2. Extend `ActionProvider<EvmWalletProvider>`
3. Define actions with `@CreateAction` decorator
4. Create schemas in `schemas.ts`
5. Add to `main.ts` action providers array
6. Document in `AGENTS.md`

### Example: New Price Oracle Agent

```typescript
// src/tools/price-oracle/index.ts
export class PriceOracleActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super('priceOracle', []);
  }

  @CreateAction({
    name: 'get_token_price',
    description: 'Get current price of a token in USD',
    schema: GetTokenPriceSchema,
  })
  async getTokenPrice(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetTokenPriceSchema>,
  ) {
    // Implementation
  }
}
```

## Error Handling

### Error Flow

```
Agent Error → Caught by Action Provider 
  → Formatted error message
    → Returned to MCP Server
      → Sent to Client
        → Displayed to User
```

### Error Types

1. **Validation Errors**: Invalid inputs caught by Zod
2. **Network Errors**: RPC connection issues
3. **Transaction Errors**: Reverted transactions
4. **API Errors**: External API failures

## Testing Strategy (Future)

### Unit Tests
- Individual agent functionality
- Input validation
- Error handling

### Integration Tests
- Multi-agent workflows
- End-to-end operations
- Client integration

### Simulation Tests
- Transaction simulation before execution
- Portfolio rebalancing scenarios
- Risk management validation

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│         User's Machine                   │
│                                          │
│  ┌────────────────────────────────┐    │
│  │     Claude Desktop              │    │
│  │                                 │    │
│  │  ┌──────────────────────────┐  │    │
│  │  │  MCP Client               │  │    │
│  │  └──────────┬────────────────┘  │    │
│  └─────────────┼────────────────────┘    │
│                │ stdio                    │
│  ┌─────────────▼────────────────┐        │
│  │  Base MCP Server (Node.js)   │        │
│  │  • All agents loaded         │        │
│  │  • REST API on port 4000     │        │
│  └─────────────┬────────────────┘        │
└────────────────┼─────────────────────────┘
                 │
                 │ HTTPS
                 │
┌────────────────▼─────────────────────────┐
│         Base Network (Blockchain)        │
│         • Smart Contracts                │
│         • DeFi Protocols                 │
│         • Token Contracts                │
└──────────────────────────────────────────┘
```

## Summary

The Base MCP Server is a well-architected system that:

1. **Centralizes** blockchain operations through a nexus pattern
2. **Specializes** functionality into focused agents
3. **Coordinates** multi-step operations through the MCP protocol
4. **Extends** easily with new agents and capabilities
5. **Secures** operations through multiple validation layers
6. **Performs** efficiently with async operations and optimization

The architecture is **ready for production** with all core agents functional and well-documented paths for future enhancements like the Apex Agent and consensus mechanisms.
