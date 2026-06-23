require('dotenv').config();
const fs = require('fs');
const pdfParse = require('pdf-parse');
const express = require('express');
const path = require('path');
const multer = require('multer');
const pg = require('pg');
const { chunkText } = require('./chunkers.js');
const { createEmbedding } = require('./embedding.js');
const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const port = process.env.PORT;

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

pool.connect()
  .then(() => console.log('DB connected'))
  .catch(err => console.error('DB error', err));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, '/home/manoj/jos/ai-knowledge-assistant/uploads');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage });

app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const buffer = fs.readFileSync(req.file.path);
        const parsed = await pdfParse(buffer);
        const text = parsed.text;
        const chunks = chunkText(text);

        const result_documents = await pool.query(
            `INSERT INTO documents (content, file_name) VALUES ($1, $2) RETURNING id`,
            [text, req.file.originalname]
        );

        const documentId = result_documents.rows[0].id;

        for (let i = 0; i < chunks.length; i++) {
            const chunkResult = await pool.query(
                'INSERT INTO document_chunks (document_id, chunk_index, chunk_text) VALUES ($1, $2, $3) RETURNING id',
                [documentId, i, chunks[i]]
            );
            const chunkId = chunkResult.rows[0].id;
            const embedding = await createEmbedding(chunks[i]);

            await pool.query(
                'INSERT INTO embeddings (chunk_id, vector) VALUES ($1, $2)',
                [chunkId, `[${embedding.join(',')}]`]
            );
        }

        res.send('File uploaded successfully');
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to process file', error: err.message });
    }
});

app.get('/documents', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, file_name, uploaded_at FROM documents ORDER BY uploaded_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error("Database Error on /documents:", err);
        res.status(500).json({ error: err.message });
    }
});;

app.post('/search', async (req, res) => {

    try{

        if (!req.body.question) {
            return res.status(400).json({
                message: 'Question is required'
            });
        }

        const question = req.body.question;
        const queryVector = await createEmbedding(question);
        console.log(queryVector);

        const result = await pool.query(
            `
            SELECT
                dc.chunk_text,
                e.vector <=> $1 AS distance
            FROM embeddings e
            JOIN document_chunks dc
            ON dc.id = e.chunk_id
            ORDER BY distance
            LIMIT 1
            `,
            [`[${queryVector.join(',')}]`]
        );
        res.json(result.rows);
        console.log(result);
        }catch (err) {
    
            console.error(err);
            res.status(500).json({
                message: 'Search failed',
                error: err.message
            });
    }
});

app.post('/ask', async (req, res) => {

    try {

        const startTime = Date.now();

        const question = req.body.question;

        const queryVector = await createEmbedding(question);

        const result = await pool.query(
            `
            SELECT
                dc.chunk_text,
                e.vector <=> $1 AS distance
            FROM embeddings e
            JOIN document_chunks dc
            ON dc.id = e.chunk_id
            ORDER BY distance
            LIMIT 1
            `,
            [`[${queryVector.join(',')}]`]
        );

        const context = result.rows.map(row => row.chunk_text).join('\n\n');
        const distance = result.rows[0]?.distance;

        console.log("question", result, question, distance);

        if (!context || distance > 0.9) {
            return res.status(404).json({ answer: 'I could not find relevant information in the uploaded documents.' });
        }

        const response = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [
                { role: 'system', content: "You are a concise AI assistant. Answer the user's question using ONLY the provided context. Your answer MUST be extremely brief and under 150 words total." },
                { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` }
            ]
        });

        res.json({
            answer: response.choices[0].message.content,
            timeTaken: Date.now() - startTime
        })

    } catch (err) {
        console.error("FULL ERROR:", err);
        res.status(500).json({ message: err.message });
    }
});

app.delete('/documents/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM embeddings WHERE chunk_id IN (SELECT id FROM document_chunks WHERE document_id = $1)', [id]);
        await pool.query('DELETE FROM document_chunks WHERE document_id = $1', [id]);
        await pool.query('DELETE FROM documents WHERE id = $1', [id]);
        res.json({ message: 'Document deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'user.html'));
});

app.listen(port, () => {
    console.log('Server running on port 3000');
});
