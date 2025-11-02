
console.log(">>> math-captcha.js loaded!");

let currentCorrectAnswer;
let loginSubmitButton;
let difficulty = 1;
let validationTimeout;

/**
 * @param {HTMLElement} submitButtonElement 
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

    mathAnswerInput.addEventListener('input', checkAndSetLoginButtonState);
    mathAnswerInput.addEventListener('paste', () => {
        setTimeout(checkAndSetLoginButtonState, 0);
    });

    generateMathPuzzle(difficulty);
    console.log(">>> initMathCaptcha finished, first puzzle generated.");
}

function generateMathPuzzle(level = 1) {
    console.log(`>>> generateMathPuzzle called at level ${level}!`);
    let num1, num2, answer, puzzleString, operator;

    const operations = ['+', '-'];
    if (level > 2) {
        operations.push('*');
    }

    // Select a random operator
    operator = operations[Math.floor(Math.random() * operations.length)];

    if (level === 1) {
        num1 = Math.floor(Math.random() * 10) + 1;
        num2 = Math.floor(Math.random() * 10) + 1;
    } else if (level === 2) {
        num1 = Math.floor(Math.random() * 20) + 5;
        num2 = Math.floor(Math.random() * 10) + 1;
    } else {
        // Level 3
        num1 = Math.floor(Math.random() * 50) + 10;
        num2 = Math.floor(Math.random() * 20) + 5;
    }

    switch (operator) {
        case '+':
            answer = num1 + num2;
            puzzleString = `What is ${num1} + ${num2}?`;
            break;
        case '-':
            if (num1 < num2) {
                answer = num2 - num1;
                puzzleString = `What is ${num2} - ${num1}?`;
            } else {
                answer = num1 - num2;
                puzzleString = `What is ${num1} - ${num2}?`;
            }
            break;
        case '*':

            if (level === 3) {
                num1 = Math.floor(Math.random() * 10) + 1;
                num2 = Math.floor(Math.random() * 9) + 1;
            } else if (level > 3) {
                num1 = Math.floor(Math.random() * 12) + 1;
                num2 = Math.floor(Math.random() * 12) + 1;
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
        answerInput.value = '';
    }

    const errorDiv = document.getElementById('math-error');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }

    if (loginSubmitButton) {
        loginSubmitButton.disabled = true;
        console.log(">>> Login button disabled after puzzle generation.");
    }
}

/**
 * @param {string} userInput 
 * @returns {boolean|string}
 */
function _isMathAnswerCorrect(userInput) {
    const correctAnswerString = currentCorrectAnswer.toString();
    const parsedInput = parseInt(userInput, 10);

    if (isNaN(parsedInput)) {
        return false;
    }

    if (correctAnswerString.startsWith(userInput)) {
        if (parsedInput === currentCorrectAnswer) {
            return true;
        }
        return 'partial';
    }

    return false;
}


function checkAndSetLoginButtonState() {
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
        loginSubmitButton.disabled = false;
        mathErrorDiv.style.display = 'none';
    } else if (validation === 'partial') {
        loginSubmitButton.disabled = true;
        mathErrorDiv.style.display = 'none';
    } else {
        loginSubmitButton.disabled = true;
        mathErrorDiv.textContent = 'Incorrect...';
        mathErrorDiv.style.display = 'block';

        validationTimeout = setTimeout(() => {
            console.log(`>>> CAPTCHA incorrect on input. Regenerating puzzle.`);
            difficulty++;
            generateMathPuzzle(difficulty);
            mathErrorDiv.textContent = 'Incorrect. Please try this new one!';
        }, 1000);
    }
}

/**
 * Final validation during form submission.
 * @param {string} userInput - The answer entered by the user.
 * @returns {boolean} 
 */
function validateMathPuzzleOnSubmit(userInput) {
    console.log(">>> validateMathPuzzleOnSubmit called!");
    const errorDiv = document.getElementById('math-error');
    if (!errorDiv) { console.error("ERROR: mathErrorDiv is null!"); return false; }

    const parsedInput = parseInt(userInput, 10);
    const isCorrect = !isNaN(parsedInput) && parsedInput === currentCorrectAnswer;

    if (isCorrect) {
        errorDiv.style.display = 'none';
        console.log(">>> CAPTCHA correct on submit.");
        difficulty = 1; // Reset difficulty on success
        return true;
    } else {
        difficulty++;
        console.log(`>>> CAPTCHA incorrect on submit. Regenerating puzzle at level ${difficulty}.`);
        generateMathPuzzle(difficulty);

        errorDiv.textContent = 'Incorrect. Please try this new, harder one!';
        errorDiv.style.display = 'block';
        return false;
    }
}