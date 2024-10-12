// ai.js
import nlp from 'https://cdn.skypack.dev/compromise';

// Function to fetch the definition of a word
async function fetchDefinition(word) {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (!response.ok) {
        return `Definition not found for the word: ${word}.`;
    }
    const data = await response.json();
    // Extract definitions from the response
    if (data.length > 0) {
        const definitions = data[0].meanings.flatMap(meaning => 
            meaning.definitions.map(def => def.definition)
        );
        return `Definitions for "${word}": ${definitions.join(', ')}.`;
    }
    return `No definitions found for "${word}".`;
}

// Function to analyze the input sentence and provide its meaning
export async function analyzeSentence(input) {
    const cleanedInput = input.trim().toLowerCase();
    
    if (!cleanedInput) {
        return "Please enter a sentence.";
    }

    // Use Compromise for NLP tasks
    const doc = nlp(cleanedInput);

    // Sentiment detection
    const negativeWords = ["hate", "worst", "bad", "crash"];
    const positiveWords = ["love", "great", "good", "hope"];

    const isNegative = negativeWords.some(word => cleanedInput.includes(word));
    const isPositive = positiveWords.some(word => cleanedInput.includes(word));

    // Check for well-being inquiry with contextual sentiment
    if (doc.has('how are you')) {
        if (isNegative && isPositive) {
            return "The user is asking about the AI's well-being, expressing mixed feelings. How can I assist you better?";
        } else if (isNegative) {
            return "The user is asking about the AI's well-being but expressing concern or negativity.";
        } else {
            return "The user is asking about the AI's well-being.";
        }
    } 
    if (doc.has('hello')) {
        return "The user is greeting.";
    }
    if (doc.has('weather')) {
        return "The user is inquiring about the weather.";
    }
    if (doc.has('what') && doc.has('your name')) {
        return "The user is asking for the AI's name.";
    }
    
    // Handling mixed sentiments
    if (isNegative && isPositive) {
        return "The user expresses mixed feelings. How can I assist you better?";
    } 
    if (isNegative) {
        return "The user is expressing negative feelings. How can I assist you better?";
    } 
    if (isPositive) {
        return "The user is expressing positive feelings. Thank you!";
    }

    // Analyze named entities using Compromise features
    const people = doc.people().out('array');
    const places = doc.places().out('array');
    const organizations = doc.organizations().out('array');
    const topics = doc.topics().out('array');
    
    // Construct response based on detected entities
    let response = [];
    
    if (people.length > 0) {
        response.push(`The user mentioned the following people: ${people.join(', ')}.`);
    }
    if (places.length > 0) {
        response.push(`The user mentioned the following places: ${places.join(', ')}.`);
    }
    if (organizations.length > 0) {
        response.push(`The user mentioned the following organizations: ${organizations.join(', ')}.`);
    }
    if (topics.length > 0) {
        response.push(`The user mentioned topics related to: ${topics.join(', ')}.`);
    }

    // Detect words for definition fetching
    const wordsToDefine = cleanedInput.split(' ').filter(word => /^[a-zA-Z]+$/.test(word));
    const definitions = await Promise.all(wordsToDefine.map(word => fetchDefinition(word)));

    // Add definitions to the response
    definitions.forEach(def => {
        response.push(def);
    });

    // Optional: Regex for basic time detection
    const timePattern = /\b(\d{1,2}:\d{2}|\d{1,2} (am|pm|AM|PM))\b/g;
    const foundTimes = cleanedInput.match(timePattern);
    if (foundTimes) {
        response.push(`The user mentioned times: ${foundTimes.join(', ')}.`);
    }

    // Final response construction
    if (response.length > 0) {
        return response.join(' ');
    }

    // Fallback if no entities are detected
    return "The meaning is unclear. Please rephrase your question.";
}
