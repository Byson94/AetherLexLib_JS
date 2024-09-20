/*
 * This file uses the Fuse.js library.
 * Fuse.js is licensed under the Apache License, Version 2.0.
 * See: https://github.com/krisk/Fuse
 */

import { learningDataProvided } from './data.js';
import Fuse from 'https://cdn.skypack.dev/fuse.js';

// Basic conversation data with context management
let conversationData = {
    history: [],
    context: {}
};

// Predefined responses with flexible categories
const responses = {
    greetings: ["hello", "hi", "hey", "greetings"],
    farewell: ["goodbye", "bye", "see you", "farewell"],
    affirmations: ["yes", "yep", "sure", "ok", "okay"],
    negations: ["no", "nope", "not really"],
    gratitude: ["thanks", "thank you", "thx"],
    help: ["help", "assist", "support", "how can I help"],
    confusion: ["huh", "what", "i don't understand"],
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

// Initialize Fuse for fuzzy matching with higher threshold and more search results
const fuse = new Fuse(parsedLearningData, {
    keys: ['userMessage'],
    includeScore: true,
    threshold: 0.3, // Adjusted threshold for better matches
    minMatchCharLength: 2, // Ensure longer matches
    shouldSort: true,
});

function extractKeywords(userInput) {
    const stopWords = ["who", "what", "when", "where", "why", "is", "the", "a", "of", "on", "and", "for", "with", "to", "from", "by"];
    const words = userInput.toLowerCase().split(/\s+/);
    const keywords = [];

    for (const word of words) {
        if (!stopWords.includes(word)) {
            // Split long words (e.g., "extraordinarily" could become "extra ordinary")
            if (word.length > 8) { // You can adjust the length threshold as needed
                keywords.push(...word.split(/(?=[A-Z])|(?<=\w)(?=\W)/)); // Split at capital letters or non-word boundaries
            } else {
                keywords.push(word);
            }
        }
    }

    return keywords.join(' ');
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

    // Step 3: If nothing is found, return a default fallback response
    const fallbackResponse = "Sorry, I couldn't find any information on that.";
    updateConversationData(cleanedInput, fallbackResponse);
    return fallbackResponse;
}

async function queryWikidata(query) {
    const keywords = extractKeywords(query); // Extract relevant keywords
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

// Function to extract and calculate the mathematical expression
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

// Function to find the best match from learning data using fuzzy matching
function findBestLearningMatch(input) {
    const keywords = extractKeywords(input); // Extract relevant keywords from the input
    const result = fuse.search(keywords); // Search using the keywords
    if (result.length > 0) {
        return result[0].item.aiResponse; // Return the closest matching response
    }
    return null; // No match found
}

// Function to normalize and preprocess text
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

    return normalized;
}

// Function to generate a dynamic response based on user input
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

// Function to check for repetition and respond accordingly
function checkForRepetition(userInput, aiResponse) {
    const lastResponse = conversationData.history.length > 0 ? conversationData.history[conversationData.history.length - 1].aiResponse : null;
    const recentInputs = conversationData.history.map(entry => entry.userInput);

    const relatesToLastInput = recentInputs.length > 0 && isSimilar(recentInputs[recentInputs.length - 1], userInput);

    if (aiResponse === lastResponse && !relatesToLastInput) {
        return generateDynamicResponse(userInput);
    }

    return aiResponse;
}

// Function to determine similarity between inputs
function isSimilar(input1, input2) {
    return input1.includes(input2) || input2.includes(input1);
}

// Function to update conversation data
function updateConversationData(userInput, aiResponse) {
    conversationData.history.push({ userInput, aiResponse });
}

// Function to update context based on the conversation
function updateContext(userInput) {
    if (responses.greetings.some(greet => userInput.includes(greet))) {
        conversationData.context.lastGreeting = userInput;
    }
}
