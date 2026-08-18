# AI Workflow Note

I used Cursor IDE with its AI capabilities throughout the development process, primarily as a planning, implementation, and debugging assistant rather than relying on it to build the entire application autonomously.

The biggest benefit was using Cursor's planning agent for individual features. I broke the assignment into small, manageable feature slices such as authentication context, document CRUD, rich-text editing, sharing, file import, and real-time presence. For each feature, I first asked Cursor to produce a detailed implementation plan, reviewed that plan against the actual requirements and four-hour constraint, modified it where necessary, and then implemented the feature step by step.

Cursor materially accelerated the work by helping with:

- Breaking ambiguous requirements into practical MVP features
- Designing the initial database schema and API structure
- Scaffolding NestJS modules, controllers, DTOs, and services
- Configuring the Tiptap editor and persistence flow
- Working through authorization and document-sharing logic
- Implementing the WebSocket presence flow
- Debugging TypeScript, NestJS, Prisma, and integration issues
- Suggesting test cases and edge cases that needed verification

I did not accept AI-generated solutions without review. One example was the approach to real-time collaboration. Rather than implementing full real-time document synchronization, I deliberately rejected the more complex direction involving collaborative editing/CRDT-style synchronization because it was unnecessary for the scope and would have consumed a significant portion of the timebox. I chose to implement WebSocket-based presence only: users can see who is currently viewing a document and when another user leaves, while document content remains persisted through the existing debounced REST API.

I also deliberately kept authentication lightweight. Instead of spending the majority of the assessment implementing production-grade OAuth/JWT authentication, I used seeded demo users with a lightweight session while still enforcing authorization on the server.

For verification, I treated Cursor's output as a starting point rather than a source of truth. I manually tested the complete user flows, including document creation, editing and persistence, sharing, unauthorized access, file import, and real-time presence. I also checked that formatting survives refreshes, shared users can only access permitted documents, unauthorized users are rejected, and the application builds and runs correctly after deployment. Automated tests were added for important backend behavior where appropriate.

Overall, I used Cursor to accelerate planning, implementation, debugging, and exploration, while keeping product prioritization, architectural decisions, scope control, code review, UX evaluation, and final verification under my own judgment.
