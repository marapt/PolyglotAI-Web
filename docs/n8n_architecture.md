# AI Polyglots: n8n Architecture Blueprint

*Goal: A consumer-facing app that takes files (like a .PO or .XLIFF file), translates them using multiple AI models, and returns a localized file.*

## How n8n fits: The "Invisible Backend"
For AI Polyglots, the user never sees n8n. They only see the custom React interface. 

1. **The Trigger**: A user uploads a document on `aipolyglots.com`. The frontend sends that file to an **n8n Webhook**.
2. **The Workflow**:
   - *Node 1*: Triggers a custom Python `UniversalParser` microservice to extract the text.
   - *Node 2 (Translator Agent)*: Sends the extracted text to Claude 3.5 for translation.
   - *Node 3 (Reviewer Agent)*: Sends Claude's output to GPT-4 to verify translation accuracy.
   - *Node 4 (Validator)*: Runs an `If/Else` loop. If the Reviewer found errors, route back to Node 2 for a retry.
   - *Node 5*: Triggers a Python script to rebuild the file structure with the new translations.
3. **The Response**: n8n returns the finished file to the frontend via Webhook Response for the user to download.

## Verdict
**Deploy with n8n.** Building a multi-agent retry loop, handling file streams, and managing API rate limits for Claude and OpenAI in raw Python is tedious. n8n allows us to visually build, debug, and maintain this exact translation pipeline in minutes while keeping the frontend entirely separate.
