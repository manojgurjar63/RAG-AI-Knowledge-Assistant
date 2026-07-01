AI Knowledge Assistant — Project Documentation
Project Directory: ai-knowledge-assistant

Overview
AI Knowledge Assistant is a web-based application that allows users to upload PDF documents and ask natural language questions about their content. The system uses AI to find the most relevant section from the uploaded documents and generates a concise, context-aware answer.

The project has two types of users:

Admin — uploads and manages documents
End User — asks questions through a chat interface

How It Works (High-Level Flow)
Admin uploads PDF  →  Text extracted  →  Split into chunks  →  Embeddings created  →  Stored in database
                                                                                              ↓
User asks question  →  Question embedded  →  Nearest chunk found  →  Sent to AI model  →  Answer returned
An admin uploads a PDF via the dashboard.
The backend extracts the text, splits it into overlapping chunks (500 words, 100-word overlap), and stores them in a PostgreSQL database along with their vector embeddings.
When a user asks a question in the chat, the question is converted to an embedding and compared against all stored chunk embeddings using cosine similarity.
The most relevant chunk is retrieved and passed as context to the Groq LLaMA 3.1 AI model.
The AI generates a brief answer (under 150 words) and returns it to the user along with the response time.

Tech Stack
| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, Vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | PostgreSQL (with pgvector for similarity search) |
| AI Model | Groq API — LLaMA 3.1 8B Instant |
| File Uploads | Multer |
| PDF Parsing | pdf-parse |

Project Structure

ai-knowledge-assistant/
├── public/
│   ├── index.html        # Admin Dashboard (upload & manage documents)
│   └── user.html         # User Chat Interface
├── backend-node/
│   ├── index.js          # Main server — all API routes
│   ├── chunkers.js       # Text chunking logic
│   ├── embedding.js      # Vector embedding generation
│   ├── package.json      # Node.js dependencies
│   └── .env              # Environment variables (DB credentials, API keys)
└── uploads/              # Uploaded PDF files stored here

Pages
Admin Dashboard (/)
Upload PDF documents
View all uploaded documents in a table (name, upload date, status)
Delete documents
Navigate to the chat interface
User Chat (/chat)
Type a question and press Send or Enter
Receives a real-time AI-generated answer
Shows a live "Thinking... Xs" timer while waiting for a response
Displays the final answer along with the time taken in milliseconds

API Endpoints
| Method | Endpoint | Description |
|---|---|---|
| GET | / | Serves the Admin Dashboard |
| GET | /chat | Serves the User Chat page |
| POST | /upload | Accepts a PDF file, processes and stores it |
| GET | /documents | Returns a list of all uploaded documents |
| DELETE | /documents/:id | Deletes a document and all its associated data |
| POST | /ask | Accepts a question, returns an AI-generated answer |
| POST | /search | Raw semantic search — returns the closest matching chunk |

Database Schema
Three tables are used:

documents — stores the full extracted text and file name of each uploaded PDF
document_chunks — stores individual text chunks for each document, with an index
embeddings — stores the 384-dimension vector for each chunk, used for similarity search

Key Dependencies
| Package | Purpose |
|---|---|
| express | Web server and routing |
| multer | Handling file uploads |
| pdf-parse | Extracting text from PDF files |
| pg | PostgreSQL database client |
| groq-sdk | AI response generation via Groq/LLaMA |
| dotenv | Loading environment variables |

Current Limitations / Known Issues
Embedding quality: The current embedding function is a simple word-frequency hash into a 384-dimension vector. It works but is not as accurate as a trained semantic embedding model (e.g., sentence-transformers). This may cause irrelevant answers for complex or ambiguous questions.
Single chunk retrieval: Only the single most similar chunk is passed to the AI. Multi-chunk context could improve answer quality for broad questions.
PDF only: The upload pipeline only processes PDFs. Other file types (.docx, .txt) accepted by the file picker are not processed.
No authentication: Both the admin dashboard and user chat are publicly accessible with no login.
Hardcoded upload path: The uploads directory path is hardcoded in index.js.
No search on dashboard: The search input on the admin dashboard is UI-only and not yet functional.

Environment Variables (.env)
The backend requires the following variables configured before running:

PORT — Port the server listens on
DBHOST, DBPORT, DBUSER, DBPASSWORD, DB_NAME — PostgreSQL connection details
GROQAPIKEY — API key for the Groq AI service

How to Run
bash
cd backend-node
npm install
node index.js
The application is then accessible at http://localhost:.
