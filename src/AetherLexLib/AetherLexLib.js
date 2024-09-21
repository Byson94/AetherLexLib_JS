import { learningDataProvided } from './data.js';
import { stemmingData } from './data.stemming.js';
import { lemmatizationData } from './data.lemmatization.js';
import { posDictionary } from './data.tags.js';
import Fuse from 'https://cdn.skypack.dev/fuse.js';
import nlp from 'https://cdn.skypack.dev/compromise';

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

// Parse learning data
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

// Function to tokenize text into words
function tokenize(text) {
    const stopWords = new Set(["who", "what", "when", "where", "why", "is", "the", "a", "of", "on", "and", "for", "with", "to", "from", "by"]);
    const words = text.toLowerCase().match(/\w+/g) || []; // Extract words
    return words.filter(word => !stopWords.has(word)); // Remove stop words
}

// Function to stem words based on the stemming data
function stemWord(word) {
    for (const [root, inflections] of Object.entries(stemmingData)) {
        if (inflections.includes(word)) {
            return root; // Return the root form if found
        }
    }
    return word; // Return the word itself if no stemming is found
}

// Function to lemmatize words based on the lemmatization data
function lemmatizeWord(word) {
    return lemmatizationData[word] || word; // Return the lemma if found, otherwise the word itself
}

function normalizeText(text) {
    const commonTypos = {
        "yu": "you",
        "u": "you",
        "r": "are",
        "wat": "what"
    };
    
    // Normalize punctuation and trim spaces
    let normalized = text.toLowerCase().replace(/[.,!?]+/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Replace common typos
    for (const [typo, correct] of Object.entries(commonTypos)) {
        normalized = normalized.replace(new RegExp(`\\b${typo}\\b`, 'g'), correct);
    }
    
    return normalized;
}

function segmentSentences(text) {
    // Improved to account for common sentence structures and punctuation
    return text.split(/(?<=[.!?])\s+|(?<=\b(and|but|or|so)\b)\s+/i).filter(Boolean);
}

// Function for part of speech tagging
function tagPartOfSpeech(words) {
    return words.map(word => {
        const tag = posDictionary[word] || 'Unknown';
        return { word, tag };
    });
}

// Function for named entity tagging
function tagNamedEntities(input) {
    const doc = nlp(input);
    const entities = doc.people().out('array').map(person => ({ word: person, tag: 'Person' }))
        .concat(doc.places().out('array').map(place => ({ word: place, tag: 'Place' })))
        .concat(doc.organizations().out('array').map(org => ({ word: org, tag: 'Organization' })));

    return entities;
}

async function analyzeAndRespond(userInput) {
    const segmentedInput = segmentSentences(userInput); // Split input into segments
    const responses = [];

    for (const segment of segmentedInput) {
        const cleanedInput = normalizeText(segment);
        const response = await generateResponse(cleanedInput);
        responses.push(response);
    }

    return responses.join(' ');
}

async function generateResponse(cleanedInput) {
    // Check if the input is a mathematical calculation
    if (isCalculation(cleanedInput)) {
        return calculate(cleanedInput);
    }

    // Try to match with local learning data using fuzzy matching
    const learningResponse = findBestLearningMatch(cleanedInput);
    if (learningResponse) {
        return learningResponse;
    }

    // Try to get knowledge from Wikidata
    const wikidataResponse = await queryWikidata(cleanedInput);
    if (wikidataResponse) {
        return wikidataResponse;
    }

    // If Wikidata doesn't have an answer, query DuckDuckGo as a backup
    const ddgResponse = await queryDuckDuckGo(cleanedInput);
    if (ddgResponse) {
        return ddgResponse;
    }

    // Default fallback response
    return "Sorry, I couldn't find any information on that. Try asking me something different.";
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
            return `I found information about "<strong>${item.label}</strong>": ${item.description || 'No description available.'} <a href="${link}" target="_blank">More info</a> <br> <br> - Found this on Wikidata`;
        }
    } catch (error) {
        console.error('Error fetching from Wikidata:', error);
        return null;
    }
    return null;
}

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

        // Add attribution if there is a valid result
        if (result) {
            return `${result} <br> <br> - Found this on DuckDuckGo`;
        }
    } catch (error) {
        console.error('Error fetching from DuckDuckGo:', error);
        return null;
    }
    return null;
}


function isCalculation(input) {
    const calculationPattern = /^(\d+)\s*[-+*/]\s*(\d+)$/; // Match simple arithmetic calculations like 1+1
    return calculationPattern.test(input);
}

function calculate(expression) {
    try {
        const result = new Function(`return ${expression}`)();
        return `The result is: ${result}`;
    } catch (error) {
        return "Sorry, I couldn't calculate that.";
    }
}

function findBestLearningMatch(input) {
    // Directly use the input without tokenization for full-sentence matching
    const result = fuse.search(input);
    if (result.length > 0) {
        return result[0].item.aiResponse;
    }

    // Check if input matches predefined responses first (e.g., greetings, farewells)
    for (const category in responses) {
        if (responses[category].includes(input.toLowerCase())) {
            return responses[category][Math.floor(Math.random() * responses[category].length)];
        }
    }

    return null;
}

function generateDynamicResponse(userInput) {
    const responseTemplates = [
        "That's interesting! Can you tell me more about that?",
        "I'm not sure I follow. Could you clarify your thoughts?",
        "Sounds good! What else do you want to discuss?",
        "I see! How do you feel about that?",
    ];

    const randomIndex = Math.floor(Math.random() * responseTemplates.length);
    return responseTemplates[randomIndex];
}

function updateConversationData(userInput, aiResponse) {
    conversationData.history.push({ userInput, aiResponse });
}

function checkForRepetition(input, response) {
    const previousConversation = conversationData.history.find(entry => entry.userInput === input);
    return previousConversation ? generateDynamicResponse(input) : response;
}

function updateContext(input) {
    const keywords = tokenize(input);
    for (const keyword of keywords) {
        conversationData.context[keyword] = true; // Mark keyword as part of the context
    }
}

export { analyzeAndRespond };