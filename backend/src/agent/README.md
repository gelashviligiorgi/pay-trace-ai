# Agent Loop with Tool Use

This directory contains the agentic workflow implementation that allows Claude to iteratively use tools to diagnose payment errors.

## Architecture

### Flow Diagram

```
User Error Input
     ↓
[Agent Loop] → Call Claude with TOOLS
     ↓
Stop Reason: tool_use?
     ↓ YES
Execute Tools → Return Results → Loop Back
     ↓ NO (end_turn)
Stream Final Diagnosis to Client
```

## Files

### `loop.ts`
Main agent loop implementation with:
- **System Prompt**: Instructs Claude to use tools in specific order
- **Iteration Loop**: Max 5 iterations to prevent infinite loops
- **Tool Execution**: Calls `executeTool()` for each tool Claude requests
- **Streaming**: Simulates word-by-word streaming of final diagnosis

## Tool Usage Pattern

Claude is instructed to:

1. **Always call `search_knowledge_base` first** with error keywords
2. **Then call `lookup_error_code`** if a specific code is identified
3. **Only call `check_psp_status`** if error suggests provider outage

## Tool Definitions

Located in `../tools/definitions.ts`:

### `search_knowledge_base`
- Semantic search through RAG vector database
- Returns top 5 most relevant documentation chunks
- Uses Voyage AI embeddings + Supabase pgvector

### `lookup_error_code`
- Direct lookup in static error registry
- Fast, exact matching for known error codes
- Supports optional provider filtering

### `check_psp_status`
- Check provider operational status
- Currently returns mock data (TODO: implement real status checking)

## Tool Implementations

Located in `../tools/executor.ts`:

Each tool returns a formatted string that's appended to the conversation as a tool result.

### Example Tool Execution Log

```
[Tool] search_knowledge_base | query: "insufficient funds" | duration: 243ms | results: 4 chunks
[Tool] lookup_error_code | code: "2001", provider: "braintree" | duration: 5ms | results: found
```

## Error Code Registry

Located in `../tools/registry.ts`:

Static registry containing 23 error codes:
- 8 Braintree codes (2001-2074)
- 5 Toss Payments codes
- 5 PayPal codes
- 5 3D Secure codes

## Integration with Analyze Route

The agent loop is called from `controllers/analyze.controller.ts`:

```typescript
await runAgentLoop(error, (chunk: string) => {
  // Stream to client via SSE
  res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
});
```

## Agent Loop Logic

### Iteration Process

1. **Send messages to Claude** with tools available
2. **Check stop_reason**:
   - `tool_use`: Extract tool calls, execute, add results to messages, loop
   - `end_turn`: Extract text, stream to client, finish
3. **Max 5 iterations** to prevent runaway loops

### Message Flow Example

```
Iteration 1:
User: "Error 2001 from Braintree"
↓
Claude: [tool_use] search_knowledge_base(query="2001 braintree")
↓
Tool Result: "Found 3 chunks: CODE 2001 - Insufficient Funds..."
↓

Iteration 2:
Claude: [tool_use] lookup_error_code(code="2001", provider="braintree")
↓
Tool Result: "Error Code: 2001, Source: Braintree, Meaning: Insufficient Funds..."
↓

Iteration 3:
Claude: [end_turn] "**Error Code: 2001**\n\n**Source:** Braintree..."
↓
Stream to client → Done
```

## Benefits of Tool Use

1. **Separation of Concerns**: Search logic separate from LLM
2. **Deterministic Tools**: Registry lookups are fast and exact
3. **Observable**: Every tool call is logged
4. **Composable**: Can add more tools (e.g., transaction history lookup)
5. **Cost Efficient**: Tools reduce context size vs embedding all docs

## Future Enhancements

- [ ] Implement real PSP status checking
- [ ] Add caching layer for tool results
- [ ] Add `search_similar_errors` tool for finding related issues
- [ ] Add `get_retry_policy` tool for retry guidance
- [ ] Track tool usage metrics (frequency, success rate)
