import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cors()); // Enable CORS for all routes

// Serve static files from the src directory
app.use('/src', express.static(path.join(__dirname, 'src')));

// Define a route for the root URL
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <style>
                    body {
                        background-color: #121212;
                        color: #ffffff;
                        font-family: Arial, sans-serif;
                        margin: 20;
                    }
                </style>
            </head>
            <body>
                <h3>Welcome to the API!</h3>
                <p>Use the following text area to test the API</p>
                <input id="messageInput" placeholder="Enter your message" />
                <button id="analyzeButton">Analyze</button>
                <div id="response"></div>

                <script type="module">
                        document.getElementById('analyzeButton').addEventListener('click', async () => {
                            const message = document.getElementById('messageInput').value;
                            const responseElement = document.getElementById('response');

                            try {
                                const analysisResult = message;
                                
                                // Send the analysis result to the server
                                const apiResponse = await fetch('/api/analyze', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({ analyzedResult: analysisResult }),
                                });

                                const result = await apiResponse.json();
                                responseElement.innerHTML = JSON.stringify(result);
                            } catch (error) {
                                console.error('Error:', error);
                                responseElement.innerHTML = 'Error analyzing message';
                            }
                        });
                </script>
            </body>
        </html>
    `); 
});

// Sample endpoint to analyze a message
app.post('/api/analyze', async (req, res) => {
    const { analyzedResult } = req.body;

    // Basic validation
    if (!analyzedResult) {
        return res.status(400).json({ error: 'Analyzed result is required' });
    }
    
    try {
        // Simulating the use of AetherLexLib.js on the server side
        const processedResult = await someFunctionUsingAetherLexLib(analyzedResult); // Replace with actual function

        // Send the processed result back as JSON
        res.status(200).json({ processedResult });
    } catch (error) {
        console.error('Error during analysis:', error);
        res.status(500).json({ error: 'An error occurred while processing the analyzed result' });
    }
});

// Placeholder function for processing with AetherLexLib.js
import { analyzeAndRespond } from '../src/AetherLexLib/AetherLexLib.js';
async function someFunctionUsingAetherLexLib(message) {
    // Implement the logic for processing the message using AetherLexLib.js
    return analyzeAndRespond(message); // Example return value
}

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
