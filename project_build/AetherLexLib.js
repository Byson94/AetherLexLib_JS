import { learningDataProvided } from './data.js';

// Basic in-memory conversation data
let conversationData = {
    history: []
};

// Predefined responses with more flexible categories
const responses = {
    greetings: ["hello", "hi", "hey", "greetings"],
    farewell: ["goodbye", "bye", "see you", "farewell"],
    affirmations: ["yes", "yep", "sure", "ok", "okay"],
    negations: ["no", "nope", "not really"],
    gratitude: ["thanks", "thank you", "thx"],
    help: ["help", "assist", "support", "how can I help"],
    confusion: ["huh", "what", "i don't understand"],
    learning: ["what have you learned", "what do you know now", "what's interesting", "did you learn"],
    improvement: ["what would you change", "how would you improve", "could you be better"],
    errors: ["how do you handle mistakes", "what happens when you're wrong", "error handling", "do you make mistakes"]
};

// Function to parse and index learning data
function parseLearningData(data) {
    const conversations = data.trim().split('\n\n').filter(Boolean);
    const parsedData = [];

    for (const conversation of conversations) {
        const lines = conversation.split('\n').map(line => line.trim()).filter(Boolean);
        for (let i = 0; i < lines.length; i += 2) {
            if (lines[i + 1] !== undefined) {
                const userMessage = normalizeText(lines[i]);
                const aiResponse = normalizeText(lines[i + 1]);
                parsedData.push({ userMessage, aiResponse });
            }
        }
    }

    return parsedData;
}

// Normalized learning data
const parsedLearningData = parseLearningData(learningDataProvided);

// Function to analyze and respond to user input
export async function analyzeAndRespond(userInput) {
    const cleanedInput = normalizeText(userInput);

    // Break input into words and analyze
    const wordResponse = analyzeWords(cleanedInput);
    if (wordResponse) {
        updateConversationData(userInput, wordResponse);
        return wordResponse;
    }

    // Try to match with learning data
    const learningResponse = findResponseInLearningData(cleanedInput);
    if (learningResponse) {
        updateConversationData(userInput, learningResponse);
        return learningResponse;
    }

    // If not found in learning data, generate response from predefined categories
    const response = generateResponse(cleanedInput);
    updateConversationData(userInput, response);
    return response;
}

// Function to analyze words in the input and find suitable responses
function analyzeWords(input) {
    const words = input.split(/\s+/);
    let bestResponse = null;
    let highestMatchScore = 0;

    words.forEach(word => {
        for (const [category, possibleResponses] of Object.entries(responses)) {
            const bestMatch = findBestMatch(word, possibleResponses);
            if (bestMatch) {
                const matchScore = 1; // You can customize this scoring logic
                if (matchScore > highestMatchScore) {
                    highestMatchScore = matchScore;
                    bestResponse = generateResponseForCategory(category);
                }
            }
        }
    });

    return bestResponse;
}

// Function to generate response based on category
function generateResponseForCategory(category) {
    const keywordResponses = {
        greetings: "Hi there! How can I help you today?",
        farewell: "Goodbye! Have a great day!",
        affirmations: "Got it! How can I assist you further?",
        negations: "No problem. Let me know if you need help!",
        gratitude: "You're welcome!",
        help: "I can assist you with various tasks. What do you need help with?",
        confusion: "I'm not sure I understand. Can you please clarify?",
        learning: "I learn from our conversations and try to improve with each interaction. What else would you like to teach me?",
        improvement: "If I could change something, I'd aim to be more context-aware and adaptive in conversations.",
        errors: "When I make mistakes, I rely on users like you to guide me by clarifying your questions. I’m always learning from my errors."
    };

    return keywordResponses[category] || "Sorry, I don't understand that.";
}

// Function to find response in learning data with improved matching
function findResponseInLearningData(input) {
    const normalizedInput = normalizeText(input);

    for (const data of parsedLearningData) {
        const normalizedData = normalizeText(data.userMessage);
        const distance = levenshteinDistance(normalizedInput, normalizedData);

        // Basic similarity check
        if (distance <= 5) { // Adjust threshold as needed
            return data.aiResponse;
        }

        // Advanced similarity check
        if (isSemanticallySimilar(normalizedInput, normalizedData)) {
            return data.aiResponse;
        }
    }

    return null;
}

// Function to check semantic similarity
function isSemanticallySimilar(input1, input2) {
    // Basic semantic check based on inclusion
    return input1.includes(input2) || input2.includes(input1);
}

// Function to normalize and preprocess text
function normalizeText(text) {
    return text.toLowerCase().replace(/[.,!?]/g, '').replace(/\s+/g, ' ').trim();
}

// Function to calculate Levenshtein distance between two strings
function levenshteinDistance(a, b) {
    const matrix = Array.from({ length: b.length + 1 }, (_, i) => Array.from({ length: a.length + 1 }, (_, j) => i === 0 ? j : 0));

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            matrix[i][j] = b[i - 1] === a[j - 1]
                ? matrix[i - 1][j - 1]
                : Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
        }
    }

    return matrix[b.length][a.length];
}

// Function to generate a response based on user input
function generateResponse(userInput) {
    const keywordResponses = {
        greetings: "Hi there! How can I help you today?",
        farewell: "Goodbye! Have a great day!",
        affirmations: "Got it! How can I assist you further?",
        negations: "No problem. Let me know if you need help!",
        gratitude: "You're welcome!",
        help: "I can assist you with various tasks. What do you need help with?",
        confusion: "I'm not sure I understand. Can you please clarify?",
        learning: "I learn from our conversations and try to improve with each interaction. What else would you like to teach me?",
        improvement: "If I could change something, I'd aim to be more context-aware and adaptive in conversations.",
        errors: "When I make mistakes, I rely on users like you to guide me by clarifying your questions. I’m always learning from my errors."
    };

    for (const [category, response] of Object.entries(keywordResponses)) {
        const bestMatch = findBestMatch(userInput, responses[category]);
        if (bestMatch) {
            return response;
        }
    }

    return "Sorry, I don't understand that. Could you please rephrase?";
}

// Function to find the best match from a list of phrases with a threshold
function findBestMatch(input, possibleResponses, threshold = 5) { // Adjusted threshold
    let bestMatch = null;
    let smallestDistance = Infinity;

    for (const phrase of possibleResponses) {
        const distance = levenshteinDistance(input, phrase);
        if (distance < smallestDistance) {
            smallestDistance = distance;
            bestMatch = phrase;
        }
    }

    return smallestDistance <= threshold ? bestMatch : null;
}

// Function to update conversation data
function updateConversationData(userInput, aiResponse) {
    conversationData.history.push({ userInput, aiResponse });
}

// Update the learning data to include broken parts
function updateLearningData(userInput) {
    const words = userInput.split(/\s+/);
    words.forEach(word => {
        // Add logic here to learn from the broken parts, e.g., storing in a data structure
        // Example: if (!learningData.includes(word)) { learningData.push(word); }
    });
}
