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

// Initialize Fuse for fuzzy matching
const fuse = new Fuse(parsedLearningData, {
    keys: ['userMessage'],
    includeScore: true,
    threshold: 0.4 // Adjust threshold for sensitivity
});

// Function to analyze and respond to user input
export async function analyzeAndRespond(userInput) {
    const cleanedInput = normalizeText(userInput);
    updateContext(cleanedInput);

    // Try to match with learning data first using fuzzy matching
    const learningResponse = findBestLearningMatch(cleanedInput);
    if (learningResponse) {
        const response = checkForRepetition(cleanedInput, learningResponse);
        updateConversationData(cleanedInput, response);
        return response;
    }

    // If not found in learning data, generate response from predefined categories
    const response = generateDynamicResponse(cleanedInput);
    updateConversationData(cleanedInput, response);
    return response;
}

// Function to find the best match from learning data using fuzzy matching
function findBestLearningMatch(input) {
    const result = fuse.search(input);
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

    // Select a random response from templates
    const randomResponse = responseTemplates[Math.floor(Math.random() * responseTemplates.length)];
    return randomResponse;
}

// Function to check for repetition and respond accordingly
function checkForRepetition(userInput, aiResponse) {
    const lastResponse = conversationData.history.length > 0 ? conversationData.history[conversationData.history.length - 1].aiResponse : null;
    const recentInputs = conversationData.history.map(entry => entry.userInput);

    // Check if the response is the same as the last one
    if (aiResponse === lastResponse) {
        return generateDynamicResponse(userInput);
    }

    // Check for similar previous inputs (simple string match for demonstration)
    for (const input of recentInputs) {
        if (input === userInput || isSimilar(input, userInput)) {
            // Return the last unique response for the same input
            return conversationData.history.find(entry => entry.userInput === input).aiResponse || aiResponse;
        }
    }
    
    return aiResponse;
}

// Function to determine similarity between inputs
function isSimilar(input1, input2) {
    // This can be replaced with a more sophisticated method if needed
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
