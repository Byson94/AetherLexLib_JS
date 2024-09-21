import { learningDataProvided } from './data.js';
import { stemmingData } from './data.setmming.js';
import Fuse from 'https://cdn.skypack.dev/fuse.js';

let conversationData = {
    history: [],
    context: {}
};

const responses = {
    greetings: ["hello", "hi", "hey", "greetings"],
    farewell: ["goodbye", "bye", "see you", "farewell"],
    affirmations: ["yes", "yep", "sure", "ok", "okay"],
    negations: ["no", "nope", "not really"],
    gratitude: ["thanks", "thank you", "thx"],
    help: ["help", "assist", "support", "how can I help"],
    confusion: ["huh", "what", "i don't understand"],
};

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

const parsedLearningData = parseLearningData(learningDataProvided);

const fuse = new Fuse(parsedLearningData, {
    keys: ['userMessage'],
    includeScore: true,
    threshold: 0.3,
    minMatchCharLength: 2,
    shouldSort: true,
});

// Function to stem words based on the stemming data
function stemWord(word) {
    for (const [root, inflections] of Object.entries(stemmingData)) {
        if (inflections.includes(word)) {
            return root; // Return the root form if found
        }
    }
    return word; // Return the word itself if no stemming is found
}

// Function to segment text into sentences
function segmentSentences(text) {
    return text.split(/(?<=[.!?])\s+/); // Split by sentence-ending punctuation followed by whitespace
}

// Function to tokenize text into words
function tokenize(text) {
    const stopWords = new Set(["who", "what", "when", "where", "why", "is", "the", "a", "of", "on", "and", "for", "with", "to", "from", "by"]);
    const words = text.toLowerCase().match(/\w+/g) || []; // Extract words
    return words.filter(word => !stopWords.has(word)); // Remove stop words
}

// Function to analyze and respond to user input
export async function analyzeAndRespond(userInput) {
    const cleanedInput = normalizeText(userInput);
    updateContext(cleanedInput);

    // Check if the input is a mathematical calculation
    if (isCalculation(cleanedInput)) {
        const calculationResult = calculate(cleanedInput);
        updateConversationData(cleanedInput, calculationResult);
        return calculationResult;
    }

    // Step 1: Try to match with local learning data using fuzzy matching
    const learningResponse = findBestLearningMatch(cleanedInput);
    if (learningResponse) {
        const response = checkForRepetition(cleanedInput, learningResponse);
        updateConversationData(cleanedInput, response);
        return response;
    }

    // Step 2: If no match is found, try to get knowledge from Wikidata
    const wikidataResponse = await queryWikidata(cleanedInput);
    if (wikidataResponse) {
        updateConversationData(cleanedInput, wikidataResponse);
        return wikidataResponse;
    }

    // Step 3: If no match is found, return a default fallback response
    const fallbackResponse = "Sorry, I couldn't find any information on that. Try asking me something different.";
    updateConversationData(cleanedInput, fallbackResponse);
    return fallbackResponse;
}

// Function to query Wikidata
async function queryWikidata(query) {
    const keywords = tokenize(query).join(' '); // Use tokenized keywords
    const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(keywords)}&format=json&language=en&limit=1&origin=*`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error("Failed to fetch from Wikidata");
        }
        const data = await response.json();

        if (data.search && data.search.length > 0) {
            const item = data.search[0];
            const link = `https://www.wikidata.org/wiki/${item.id}`;
            return `I found information about "<strong>${item.label}</strong>": ${item.description || 'No description available.'} <a href="${link}" target="_blank">More info</a>`;
        }
    } catch (error) {
        console.error('Error fetching from Wikidata:', error);
        return null;
    }

    return null;
}

function isCalculation(input) {
    const calculationPattern = /(\bpi\b|[-+]?[0-9]*\.?[0-9]+)(\s*[-+*/]\s*(\bpi\b|[-+]?[0-9]*\.?[0-9]+))+/;
    return calculationPattern.test(input);
}

function calculate(expression) {
    try {
        const modifiedExpression = expression
            .replace(/\bpi\b/g, 'Math.PI')
            .replace(/(\b(sin|cos|tan|sqrt|abs)\b)/g, 'Math.$1');

        const result = new Function(`return ${modifiedExpression}`)();
        return `The result is: ${result}`;
    } catch (error) {
        return "Sorry, I couldn't calculate that.";
    }
}

function findBestLearningMatch(input) {
    const keywords = tokenize(input); // Tokenize the input
    const stemmedKeywords = keywords.map(stemWord); // Stem the tokenized keywords
    const result = fuse.search(stemmedKeywords.join(' ')); // Search using the stemmed keywords
    if (result.length > 0) {
        return result[0].item.aiResponse; // Return the closest matching response
    }
    return null; // No match found
}

function normalizeText(text) {
    const commonTypos = {
        "yu": "you",
        "u": "you",
        "r": "are",
        "wat": "what"
    };

    let normalized = text.toLowerCase().replace(/[.,!?]/g, '').replace(/\s+/g, ' ').trim();
    
    // Replace common typos
    for (const [typo, correct] of Object.entries(commonTypos)) {
        normalized = normalized.replace(new RegExp(`\\b${typo}\\b`, 'g'), correct);
    }

    // Stem words
    const words = normalized.split(' ').map(stemWord);
    return words.join(' ');
}

function generateDynamicResponse(userInput) {
    const responseTemplates = [
        "That's interesting! Can you tell me more about that?",
        "I'm not sure I follow. Could you clarify your thoughts?",
        "Sounds good! What else do you want to discuss?",
        "I see! How can I assist you further?",
        "That makes sense. What's your next question?",
        "I'm here to help! What do you need assistance with?",
        "Could you elaborate on that?"
    ];

    const randomResponse = responseTemplates[Math.floor(Math.random() * responseTemplates.length)];
    return randomResponse;
}

function checkForRepetition(userInput, aiResponse) {
    const lastResponse = conversationData.history.length > 0 ? conversationData.history[conversationData.history.length - 1].aiResponse : null;
    const recentInputs = conversationData.history.map(entry => entry.userInput);

    if (recentInputs.includes(userInput) && aiResponse === lastResponse) {
        return generateDynamicResponse(userInput);
    }

    return aiResponse;
}

function updateContext(input) {
    if (input.includes('name')) {
        conversationData.context.name = true;
    } else if (input.includes('age')) {
        conversationData.context.age = true;
    }
}

function updateConversationData(userInput, aiResponse) {
    conversationData.history.push({ userInput, aiResponse });
}

export default {
    analyzeAndRespond
};
