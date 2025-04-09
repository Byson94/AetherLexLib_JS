# AetherLexLib_JS  <img src="https://github.com/Byson94/AetherLexLib_JS/blob/main/Logo.png?raw=true" alt="AetherLexLib Logo" width="30"/>

A lightweight chatbot library built for **educational and experimental purposes**.  
> ⚠️ Note: This library requires an internet connection to provide results and is not optimized for production use.

Check out the example at: [AetherLexLib AI Chatbot](https://byson94.github.io/AetherLexLib_JS/examples/)

## Table of contents:
-  [Installation & use](#how-to-download)
- [API init & use](#AetherLexAPI)

## How to download??
This project is under "MIT LICENSE" so it is free and you can use it, modify it etc. but only if you included the copy of the license of the project you used. 

**To get the library do one of these methods:**

- Downloading latest update [here](https://github.com/Byson94/AetherLexLib_JS/releases)
 
- Run ```npm i aetherlexlib_js``` to dowload it using npm.
 
- Link it to your html using:
```
<script src="https://cdn.skypack.dev/aetherlexlib_js"></script>
```


After you've downloaded the .zip, extract it and add the "project_build" and "LICENSE" files to your project to start using it. 

## How to Use the Library??
### **To use the library, follow the steps below:**

***Step 1:***
- Add a script tag with type "module" in your HTML.  
  **Example:**
  ```html
  <script type="module">
      // Your JavaScript code will go here
  </script>
  ```

***Step 2:***
- Import the library at the beginning of your script.  
  **Example:**
  ```javascript
  import { analyzeAndRespond } from './path/to/your/library.js';
  ```

***Step 3:***
- Prepare your conversation data. Ensure you have a structured dataset for training your AI. You can use a JSON format or text files as necessary.

***Step 4:***
- Call the `analyzeAndRespond` function with user input.  
  **Example:**
  ```javascript
  const userInput = "Hello, how are you?";
  const response = await analyzeAndRespond(userInput);
  console.log(response);  // Outputs the AI's response
  ```

***Step 5:***
- Handle responses appropriately within your application. You can display the response in your user interface or process it further as needed.

***Step 6:***
- (Optional) Customize the predefined responses and learning data to fit your specific use case. Modify the arrays in the `responses` object to add more context and variation.

### **Example Usage:**
Here’s a simple example that ties everything together:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chatbot Example</title>
</head>
<body>
    <div id="chat-container"></div>
    <input type="text" id="user-input" placeholder="Type your message..." />
    <button id="send-button">Send</button>

    <script type="module">
        import { analyzeAndRespond } from './path/to/your/library.js';

        document.getElementById('send-button').addEventListener('click', async () => {
            const inputField = document.getElementById('user-input');
            const userInput = inputField.value;
            const response = await analyzeAndRespond(userInput);
            
            // Display the response
            const chatContainer = document.getElementById('chat-container');
            chatContainer.innerHTML += `<div>User: ${userInput}</div>`;
            chatContainer.innerHTML += `<div>AI: ${response}</div>`;
            
            inputField.value = '';  // Clear the input field
        });
    </script>
</body>
</html>
```

An example on how to use the engine can be found on ["examples" folder](https://github.com/Byson94/AetherLexLib_JS/tree/main/examples), you can test it here: [AetherLexLib AI Chatbot](https://byson94.github.io/AetherLexLib_JS/examples/)


## AetherLexAPI
If you are unable to use the library via cdn or  npm, you can use the AetherLexAPI directly. This is a simple API that you can use to  interact with the AI.

```
const message = "hello";
const response = await fetch('https://aetherlexlib-js.onrender.com/api/analyze', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ analyzedResult:message }),
});

if (!response.ok) {
    throw new Error(`Error: ${response.status}`);
}

const data = await response.json();
responseDiv.innerHTML = `<p>Response: ${JSON.stringify(data.processedResult)}</p>`;
```

Thats it! with this, you can send and recieve  messages from the AI. 

The body is the most important thing of sending requests and it is also the one that can cause you problems!

You need to exactly add `analyzedResult:` as the message  key and the message as the value. If you do not do this, the AI will not respond and throw and error telling to use `analyzedResult:`

The response the AI will give, will be in JSON form, but for some reason if you need to just get the response as plain text and not JSON, just add this in the body element along with the `analyzedResult:`

```
body: JSON.stringify({ analyzedResult:message, isJson: false })
```

If isJson is false, then the API would only respond with plain text.

Example:

```
const response = await fetch('https://aetherlexlib-js.onrender.com/api/analyze', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ analyzedResult:message, isJson: false }),
});

if (!response.ok) {
    throw new Error(`Error: ${response.status}`);
}

const data = await response.text();
responseDiv.innerHTML = `<p>Response: ${data}</p>`;
```

## Credits
- This chatbot library uses the ["Fuse"](https://github.com/krisk/Fuse/tree/v7.0.0) library which is licensed under ["Apache 2.0"](https://www.apache.org/licenses/LICENSE-2.0.html).
- For more knowledge, the AI also uses [WikiData](https://www.wikidata.org/) which is licensed under CC0.
- Additionally, the AI utilizes [DuckDuckGo](https://duckduckgo.com/) for supplementary search data (DuckDuckGo under its own terms).
- This library incorporates the ["Compromise"](https://github.com/spencermountain/compromise) library (Licensed under MIT).
