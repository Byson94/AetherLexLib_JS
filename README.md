# AetherLexLib_JS
A lightweight chatbot library. (NOTE: This library needs the user to be online, connected to a network, to provide results.)

Check out the example at: [AetherLexLib AI Chatbot](https://byson94.github.io/AetherLexLib_JS/examples/)

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

An example on how to use the engine can be found on "/examples/index.html", you can test it here: [AetherLexLib AI Chatbot](https://byson94.github.io/AetherLexLib_JS/examples/)

## Credits
- This chatbot library uses the ["Fuse"](https://github.com/krisk/Fuse/tree/v7.0.0) library which is licensed under ["Apache 2.0"](https://www.apache.org/licenses/LICENSE-2.0.html)
