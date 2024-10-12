/*
 * This file uses the Fuse.js library for better response matching and WikiData for knowledge retrieval.
 * Fuse.js is licensed under the Apache License, Version 2.0 and WikiData under CC0.
 * See: https://github.com/krisk/Fuse
 * See: https://www.wikidata.org/
 */

import { learningDataProvided } from './data.js';
import { stemmingData } from './data.stemming.js';
import { lemmatizationData } from './data.lemmatization.js';
import { posDictionary } from './data.tags.js';
import { responses } from './responses.js';
import { wordValues } from './wordvalue.js';
import Fuse from 'https://cdn.skypack.dev/fuse.js';
import nlp from 'https://cdn.skypack.dev/compromise';

let conversationData = {
    history: [],
    context: {},
    wordUsage: {}
};

// Parse learning data into structured format
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

// Initialize Fuse.js for fuzzy matching
const fuse = new Fuse(parsedLearningData, {
    keys: ['userMessage'],
    includeScore: true,
    threshold: 0.3,
    minMatchCharLength: 2,
    shouldSort: true,
});

// Utility functions for text processing
function tokenize(text) {
    const stopWords = new Set(["who", "what", "when", "where", "why", "is", "the", "a", "of", "on", "and", "for", "with", "to", "from", "by"]);
    const words = text.toLowerCase().match(/\w+/g) || []; 
    return words.filter(word => !stopWords.has(word)); 
}

function stemWord(word) {
    for (const [root, inflections] of Object.entries(stemmingData)) {
        if (inflections.includes(word)) {
            return root; 
        }
    }
    return word; 
}

function lemmatizeWord(word) {
    return lemmatizationData[word] || word; 
}

function normalizeText(text) {
    const commonTypos = {
        "yu": "you",
        "u": "you",
        "r": "are",
        "wat": "what",
        "is": "s",
        "this": "ths",
        "that": "tht",
        "hey": "hy",
        "duck": "dukc"
    };
    
    let normalized = text.toLowerCase().replace(/[.,!?]+/g, ' ').replace(/\s+/g, ' ').trim();
    
    for (const [typo, correct] of Object.entries(commonTypos)) {
        normalized = normalized.replace(new RegExp(`\\b${typo}\\b`, 'g'), correct);
    }
    
    return normalized;
}

function segmentSentences(text) {
    return text.split(/(?<=[.!?])\s+|(?<=\b(and|but|or|so)\b)\s+/i).filter(Boolean);
}

function tagPartOfSpeech(words) {
    return words.map(word => {
        const tag = posDictionary[word] || 'Unknown';
        return { word, tag };
    });
}

function tagNamedEntities(input) {
    const doc = nlp(input);
    const entities = doc.people().out('array').map(person => ({ word: person, tag: 'Person' }))
        .concat(doc.places().out('array').map(place => ({ word: place, tag: 'Place' })))
        .concat(doc.organizations().out('array').map(org => ({ word: org, tag: 'Organization' })));

    return entities;
}

// Initialize uniqueValueCounter based on the current highest unique value
let uniqueValueCounter = Object.keys(wordValues).length > 0 ? Math.max(...Object.values(wordValues)) + 1 : 1221;

function getWordValue(word) {

    // Check if the word is in the wordValues object
    if (wordValues[word]) {
        return wordValues[word]; // Return the existing value
    } else {
        // If the word is not found
        const uniqueValue = uniqueValueCounter++;
        wordValues[word] = uniqueValue; // Assign the unique value to the new word
        return 0; // Return 0 for not found
    }
}

// Update tokenize function to return words with their values
function tokenizeWithValues(text) {
    const stopWords = new Set(["who", "what", "when", "where", "why", "is", "the", "a", "of", "on", "and", "for", "with", "to", "from", "by"]);
    const words = text.toLowerCase().match(/\w+/g) || []; 
    return words
        .filter(word => !stopWords.has(word))
        .map(word => ({ word, value: getWordValue(word) })); // Return an object with word and its value
}


// Main function to analyze user input and generate response
async function analyzeAndRespond(userInput) {
    const segmentedInput = segmentSentences(userInput);
    const responses = [];

    for (const segment of segmentedInput) {
        const cleanedInput = normalizeText(segment);

        // Update context based on user input
        checkContext(cleanedInput);

        // NLP processing
        const tokensWithValues = tokenizeWithValues(cleanedInput);
        const stemmedTokens = tokensWithValues.map(token => stemWord(token.word));
        const lemmatizedTokens = stemmedTokens.map(lemmatizeWord);

        // Track word usage
        trackWordUsage(tokensWithValues);

        const posTags = tagPartOfSpeech(lemmatizedTokens);
        const namedEntities = tagNamedEntities(cleanedInput);

        // Decide whether to search for information
        const shouldSearch = predictSearchNeed(cleanedInput);

        let response;
        if (shouldSearch) {
            response = await generateResponse(cleanedInput, posTags, namedEntities);
        } else {
            response = findBestLearningMatch(cleanedInput) || "Sorry, I couldn't find any specific information on that. Try asking me something different.";
        }

        responses.push(response);
    }

    return responses.join(' ');
}

// Function to predict whether to search for information
function predictSearchNeed(input) {
    const searchKeywords = ['what', 'who', 'when', 'where', 'why', 'how', 'explain', 'define', 'tell me about'];
    const intentKeywords = ['recommend', 'suggest', 'need', 'want', 'like', 'prefer'];
    const lowerInput = input.toLowerCase();

    // Check for search intent
    const isSearchIntent = searchKeywords.some(keyword => lowerInput.includes(keyword));
    // Check for action intent
    const isActionIntent = intentKeywords.some(keyword => lowerInput.includes(keyword));

    return isSearchIntent || isActionIntent;
}

// Function to track word usage
function trackWordUsage(tokens) {
    for (const { word } of tokens) {
        if (conversationData.wordUsage[word]) {
            conversationData.wordUsage[word]++;
        } else {
            conversationData.wordUsage[word] = 1;
        }
    }
}

// Define fallback responses
const fallbackResponses = [
    "Hmm, I'm not sure about that. Can you ask me something else?",
    "That's an interesting question! Unfortunately, I don't have the answer at the moment.",
    "I wish I could help with that, but I need a bit more information.",
    "It seems I don't have the answer you're looking for. Want to try a different question?",
    "I can't find that information right now. Maybe ask me something else?",
    "I'm still learning! If you have a different question, I'd love to help."
];

// Generate appropriate response based on input analysis
async function generateResponse(cleanedInput, posTags, namedEntities) {
    // Check for mathematical calculations
    if (isCalculation(cleanedInput)) {
        return calculate(cleanedInput);
    }

    // Attempt to find a match in learning data
    const learningResponse = findBestLearningMatch(cleanedInput);
    if (learningResponse) {
        return learningResponse;
    }

    // Query Wikidata and DuckDuckGo only if it's a question
    const wikidataResponse = await queryWikidata(cleanedInput);
    if (wikidataResponse) {
        return wikidataResponse;
    }

    const ddgResponse = await queryDuckDuckGo(cleanedInput);
    if (ddgResponse) {
        return ddgResponse;
    }

    // Select a random fallback response
    const randomFallback = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];

    // Provide a default message that only includes the Wikipedia search if previous searches failed
    return `${randomFallback} ${await searchWikipedia(cleanedInput)}`;
}


async function searchWikipedia(query) {
    const keywords = encodeURIComponent(query);
    const url = `https://en.wikipedia.org/w/index.php?search=${keywords}`;

    return `Sorry, I couldn't find any specific information, but this may help: ${url}`;
}

async function queryWikidata(query) {
    const keywords = tokenize(query).join(' ');
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
            return `I found information about "${item.label}": ${item.description || 'No description available.'} ${link} - Found this on Wikidata`;
        }
    } catch (error) {
        console.error('Error fetching from Wikidata:', error);
        return null;
    }
    return null;
}

// Function to query DuckDuckGo for information
async function queryDuckDuckGo(query) {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error("Failed to fetch from DuckDuckGo");
        }
        const data = await response.json();
        let result = null;

        if (data.AbstractText) {
            result = data.AbstractText;
        } else if (data.RelatedTopics && data.RelatedTopics.length > 0) {
            result = data.RelatedTopics[0].Text;
        }

        if (result) {
            return `${result}] - Found this on DuckDuckGo`;
        }
    } catch (error) {
        console.error('Error fetching from DuckDuckGo:', error);
        return null;
    }
    return null;
}

// Function to determine if the input is a calculation
function isCalculation(input) {
    const calculationPattern = /^(\d+)\s*[-+*/]\s*(\d+)$/; 
    return calculationPattern.test(input);
}

// Function to perform calculations
function calculate(expression) {
    try {
        const result = new Function(`return ${expression}`)();
        return `The result is: ${result}`;
    } catch (error) {
        return "Sorry, I couldn't calculate that.";
    }
}

// Function to get the most used word
function getMostUsedWord() {
    let maxCount = 0;
    let mostUsedWord = '';

    for (const [word, count] of Object.entries(conversationData.wordUsage)) {
        if (count > maxCount) {
            maxCount = count;
            mostUsedWord = word;
        }
    }

    return mostUsedWord ? { word: mostUsedWord, count: maxCount, value: getWordValue(mostUsedWord) } : null;
}


// Find the best response from learning data or predefined responses
function findBestLearningMatch(input) {
    const result = fuse.search(input);
    if (result.length > 0) {
        return result[0].item.aiResponse;
    }

    // Fallback to predefined responses based on user input
    for (const category in responses) {
        if (responses[category].includes(input.toLowerCase())) {
            return responses[category][Math.floor(Math.random() * responses[category].length)];
        }
    }

    return null;
}

// Update context based on user input
function checkContext(input) {
    // Implement your context handling logic here
    // Example: Set context based on specific keywords or phrases in input
    if (input.includes("weather")) {
        conversationData.context.weather = true;
    }
    // Add more context checks as needed
}

// Export necessary functions
export { analyzeAndRespond, queryWikidata, queryDuckDuckGo, calculate, checkContext };