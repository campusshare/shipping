// js/math-captcha.js (NON-MODULE, with increasing difficulty)

console.log(">>> math-captcha.js loaded!");

let currentCorrectAnswer;
let loginSubmitButton; // Reference to the login button
let difficulty = 1; // Start at level 1
let validationTimeout; // To prevent rapid-fire regeneration

/**
 * Initializes the math CAPTCHA, sets up event listeners, and generates the first puzzle.
 * @param {HTMLElement} submitButtonElement - The login form's submit button element.
 */
function initMathCaptcha(submitButtonElement) {
    console.log(">>> initMathCaptcha called!");
    loginSubmitButton = submitButtonElement;
    const mathAnswerInput = document.getElementById('math-answer');

    if (!loginSubmitButton) {
        console.error("ERROR: Login submit button not found in initMathCaptcha!");
        return;
    }
    if (!mathAnswerInput) {
        console.error("ERROR: Math answer input (id='math-answer') not found in initMathCaptcha!");
        return;
    }

    // This listener enables/disables the login button as the user types
    mathAnswerInput.addEventListener('input', checkAndSetLoginButtonState);
    mathAnswerInput.addEventListener('paste', () => {
        setTimeout(checkAndSetLoginButtonState, 0);
    });

    generateMathPuzzle(difficulty); // Generate the first puzzle
    console.log(">>> initMathCaptcha finished, first puzzle generated.");
}

/**
 * Generates a random math puzzle and displays it.
 * Stores the correct answer and disables the login button.
 */
function generateMathPuzzle(level = 1) {
    console.log(`>>> generateMathPuzzle called at level ${level}!`);
    let num1, num2, answer, puzzleString, operator;

    const operations = ['+', '-'];
    if (level > 2) { // Let's make multiplication a bit harder to get to
        operations.push('*');
    }

    // Select a random operator
    operator = operations[Math.floor(Math.random() * operations.length)];

    // Increase number range based on difficulty
    if (level === 1) {
        num1 = Math.floor(Math.random() * 10) + 1; // 1-10
        num2 = Math.floor(Math.random() * 10) + 1; // 1-10
    } else if (level === 2) {
        num1 = Math.floor(Math.random() * 20) + 5; // 5-24
        num2 = Math.floor(Math.random() * 10) + 1; // 1-10
    } else {
        // Level 3 and above
        num1 = Math.floor(Math.random() * 50) + 10; // 10-59
        num2 = Math.floor(Math.random() * 20) + 5; // 5-24
    }

    switch (operator) {
        case '+':
            answer = num1 + num2;
            puzzleString = `What is ${num1} + ${num2}?`;
            break;
        case '-':
            if (num1 < num2) { // Ensure no negative answers
                answer = num2 - num1;
                puzzleString = `What is ${num2} - ${num1}?`;
            } else {
                answer = num1 - num2;
                puzzleString = `What is ${num1} - ${num2}?`;
            }
            break;
        case '*':
            // Make multiplication a bit easier
            if (level === 3) {
                num1 = Math.floor(Math.random() * 10) + 1; // 1-10
                num2 = Math.floor(Math.random() * 9) + 1;  // 1-9
            } else if (level > 3) {
                num1 = Math.floor(Math.random() * 12) + 1; // 1-12
                num2 = Math.floor(Math.random() * 12) + 1; // 1-12
            }
            answer = num1 * num2;
            puzzleString = `What is ${num1} * ${num2}?`;
            break;
    }

    currentCorrectAnswer = answer;
    console.log(`>>> New puzzle: ${puzzleString}, Answer: ${currentCorrectAnswer}`);

    const puzzleElement = document.getElementById('math-puzzle');
    if (puzzleElement) {
        puzzleElement.textContent = puzzleString;
    }

    const answerInput = document.getElementById('math-answer');
    if (answerInput) {
        answerInput.value = ''; // Clear any previous user input
    }

    const errorDiv = document.getElementById('math-error');
    if (errorDiv) {
        errorDiv.style.display = 'none'; // Hide any previous errors
    }

    // Force button disable after generation
    if (loginSubmitButton) {
        loginSubmitButton.disabled = true;
        console.log(">>> Login button disabled after puzzle generation.");
    }
}

/**
 * Internal function to validate the user's math puzzle answer.
 * @param {string} userInput - The answer entered by the user.
 * @returns {boolean|string} - True if correct, 'partial' if incomplete, false if wrong.
 */
function _isMathAnswerCorrect(userInput) {
    const correctAnswerString = currentCorrectAnswer.toString();
    const parsedInput = parseInt(userInput, 10);

    if (isNaN(parsedInput)) {
        return false; // Not a number
    }

    // Check for partial match
    if (correctAnswerString.startsWith(userInput)) {
        // If it's a partial match AND the full answer, it's correct
        if (parsedInput === currentCorrectAnswer) {
            return true;
        }
        // If it's just a partial match (e.g., "1" for "10"), don't fail yet
        return 'partial';
    }

    // If it's not a partial match and not the correct answer, it's wrong
    return false;
}

/**
 * Checks the current math puzzle input and enables/disables the login button.
 * This runs as the user types.
 */
function checkAndSetLoginButtonState() {
    // Clear any existing timer to avoid regenerating too quickly
    clearTimeout(validationTimeout);

    const mathAnswerInput = document.getElementById('math-answer');
    const mathErrorDiv = document.getElementById('math-error');

    if (!loginSubmitButton || !mathAnswerInput || !mathErrorDiv) return;

    const userInput = mathAnswerInput.value.trim();
    const validation = _isMathAnswerCorrect(userInput);

    if (userInput === '') {
        loginSubmitButton.disabled = true;
        mathErrorDiv.style.display = 'none';
    } else if (validation === true) {
        // --- Answer is CORRECT ---
        loginSubmitButton.disabled = false; // ENABLE the button
        mathErrorDiv.style.display = 'none';
    } else if (validation === 'partial') {
        // --- Answer is PARTIALLY correct (e.g., user typed "1" for answer "10") ---
        loginSubmitButton.disabled = true;
        mathErrorDiv.style.display = 'none';
    } else {
        // --- Answer is fully WRONG (e.g., user typed "5" for answer "10") ---
        loginSubmitButton.disabled = true;
        mathErrorDiv.textContent = 'Incorrect...'; // Show a brief message
        mathErrorDiv.style.display = 'block';

        // --- THIS IS THE NEW BEHAVIOR YOU REQUESTED ---
        // Wait 1 second after the user stops typing, then regenerate
        validationTimeout = setTimeout(() => {
            console.log(`>>> CAPTCHA incorrect on input. Regenerating puzzle.`);
            difficulty++; // Make it harder
            generateMathPuzzle(difficulty); // Generate a new puzzle
            mathErrorDiv.textContent = 'Incorrect. Please try this new one!';
        }, 1000); // 1-second delay
    }
}

/**
 * Final validation during form submission.
 * @param {string} userInput - The answer entered by the user.
 * @returns {boolean} - True if the answer is correct, false otherwise.
 */
function validateMathPuzzleOnSubmit(userInput) {
    console.log(">>> validateMathPuzzleOnSubmit called!");
    const errorDiv = document.getElementById('math-error');
    if (!errorDiv) { console.error("ERROR: mathErrorDiv is null!"); return false; }

    // Use a simpler check here: is the typed number exactly the correct answer?
    const parsedInput = parseInt(userInput, 10);
    const isCorrect = !isNaN(parsedInput) && parsedInput === currentCorrectAnswer;

    if (isCorrect) {
        errorDiv.style.display = 'none';
        console.log(">>> CAPTCHA correct on submit.");
        difficulty = 1; // Reset difficulty on success
        return true;
    } else {
        // Regenerate a new, harder question
        difficulty++;
        console.log(`>>> CAPTCHA incorrect on submit. Regenerating puzzle at level ${difficulty}.`);
        generateMathPuzzle(difficulty);

        // Show a message
        errorDiv.textContent = 'Incorrect. Please try this new, harder one!';
        errorDiv.style.display = 'block';
        return false;
    }
}