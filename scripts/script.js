/**
 * Calculator application that handles basic arithmetic operations
 * Uses the Shunting Yard algorithm to convert infix expressions to postfix (RPN)
 * and then evaluates them.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Get DOM elements
  const inputField = document.getElementById("input");
  const resultField = document.getElementById("result");
  const calculateButton = document.getElementById("calculate");
  const clearButton = document.getElementById("clear");
  const ceButton = document.getElementById("ce");
  const backspaceButton = document.getElementById("backspace");
  const toggleSignButton = document.getElementById("toggle-sign");
  const buttons = document.querySelectorAll("button");

  if (!inputField || !resultField || !calculateButton) {
    console.error("Critical DOM elements not found");
    return;
  }

  // Calculate result on clicking "=" button
  calculateButton.addEventListener("click", () => {
    const equation = inputField.textContent;
    if (!equation.trim()) return;

    try {
      const result = calculate(equation);
      resultField.textContent = formatResult(result);
    } catch (error) {
      resultField.textContent = "Error: " + error.message;
      console.error("Calculation error:", error);
    }
  });

  // Handle button clicks
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.getAttribute("data-value");
      if (value === null) {
        console.error("Button doesn't have data-value attribute", button);
        return;
      }

      handleButtonPress(value);
    });
  });

  // Add keyboard support
  document.addEventListener("keydown", (event) => {
    const key = event.key;

    // Map keyboard keys to calculator actions
    if (/[\d\+\-\*\/\(\)\.\%\^]/.test(key)) {
      handleButtonPress(key);
    } else if (key === "Enter") {
      calculateButton.click();
    } else if (key === "Backspace") {
      handleButtonPress("backspace");
    } else if (key === "Escape") {
      handleButtonPress("C");
    }
  });

  // Button handling function
  function handleButtonPress(value) {
    switch (value) {
      case "C":
        // Clear all
        inputField.textContent = "";
        resultField.textContent = "";
        break;
      case "CE":
        // Clear entry (last number)
        inputField.textContent = inputField.textContent.replace(/[\d.]+$/, "");
        break;
      case "backspace":
        // Delete last character
        inputField.textContent = inputField.textContent.slice(0, -1);
        break;
      case "toggle-sign":
        // Toggle positive/negative for the last number
        toggleLastNumberSign();
        break;
      case "=":
        // Calculate button is handled separately
        // prevent additional actions to the input field
        break;
      default:
        // For all other buttons, append the value to the input
        inputField.textContent += value;
        break;
    }
  }

  // Function to toggle sign of the last number in the expression
  function toggleLastNumberSign() {
    const expr = inputField.textContent;
    // Find the last number in the expression
    const lastNumberRegex = /((^|[+\-*/^%(])-?\d+(\.\d+)?|\d+(\.\d+)?)$/;
    const match = expr.match(lastNumberRegex);

    if (match) {
      const lastNumber = match[0];
      const position = expr.lastIndexOf(lastNumber);

      // Check if the number is already negative
      if (lastNumber.startsWith("-")) {
        // Remove the negative sign
        inputField.textContent =
          expr.substring(0, position) + lastNumber.substring(1);
      } else {
        // Add a negative sign, handling operators correctly
        const charBeforeNumber = position > 0 ? expr[position - 1] : "";
        if (/[+\-*/^%(]/.test(charBeforeNumber)) {
          // If preceded by an operator, just insert minus
          inputField.textContent =
            expr.substring(0, position) + "-" + lastNumber;
        } else {
          // Otherwise, need to wrap with negate expression
          inputField.textContent =
            expr.substring(0, position) + "-" + lastNumber;
        }
      }
    }
  }

  // Format result to avoid very long decimal numbers
  function formatResult(result) {
    // Handle special cases
    if (isNaN(result)) return "Error";
    if (!isFinite(result)) return result > 0 ? "Infinity" : "-Infinity";

    // Convert to string with fixed precision for large numbers
    if (
      Math.abs(result) >= 1e10 ||
      (Math.abs(result) < 1e-10 && result !== 0)
    ) {
      return result.toExponential(10);
    }

    // Use toFixed for normal numbers but remove trailing zeros
    return parseFloat(result.toFixed(10)).toString();
  }
});

/**
 * Calculate the result of a mathematical expression
 * @param {string} equation - The equation to evaluate
 * @returns {number} - The result of the calculation
 */
function calculate(equation) {
  if (equation == null) {
    throw new Error("Equation cannot be null or undefined");
  }

  // 1) Remove spaces
  let expr = equation.replace(/\s+/g, "");

  // Exit early for empty input
  if (!expr) return 0;

  // 2) Insert implicit '*' between:
  //    a) number or ')'  and  '('
  //    b) ')' and number or '('
  expr = expr.replace(/(\d|\))\(/g, "$1*(").replace(/\)(?=\d|\()/g, ")*");

  // 3) Handle unary minus by injecting a 0 in front:
  //    at the start, or after an operator or '('
  expr = expr.replace(/(^|[+\-*/^%\(])-/g, "$10-");

  // 4) Tokenize: numbers (with decimals), operators, parentheses, '%'
  const tokens = [];
  let numBuf = "";
  for (let c of expr) {
    if (/\d|\./.test(c)) {
      numBuf += c; // build up a number
    } else {
      if (numBuf) {
        tokens.push(numBuf);
        numBuf = "";
      }
      tokens.push(c); // operator or paren or '%'
    }
  }
  if (numBuf) tokens.push(numBuf);

  // 5) Shunting‑Yard → postfix (RPN)
  const prec = { "^": 4, "%": 3, "*": 2, "/": 2, "+": 1, "-": 1 };
  const assoc = { "^": "R", "%": "L", "*": "L", "/": "L", "+": "L", "-": "L" };

  const output = [];
  const ops = [];

  for (let tok of tokens) {
    if (/^\d+(\.\d+)?$/.test(tok)) {
      // number
      output.push(parseFloat(tok));
    } else if (tok === "%") {
      // percent is postfix: we treat it as an operator
      while (
        ops.length &&
        ops[ops.length - 1] in prec &&
        prec[ops[ops.length - 1]] >= prec["%"]
      ) {
        output.push(ops.pop());
      }
      ops.push(tok);
    } else if (tok in prec) {
      // binary operator
      while (
        ops.length &&
        ops[ops.length - 1] in prec &&
        ((assoc[tok] === "L" && prec[tok] <= prec[ops[ops.length - 1]]) ||
          (assoc[tok] === "R" && prec[tok] < prec[ops[ops.length - 1]]))
      ) {
        output.push(ops.pop());
      }
      ops.push(tok);
    } else if (tok === "(") {
      ops.push(tok);
    } else if (tok === ")") {
      while (ops.length && ops[ops.length - 1] !== "(") {
        output.push(ops.pop());
      }
      if (!ops.length) throw new Error("Mismatched parentheses");
      ops.pop(); // remove "("
    } else {
      throw new Error("Unknown token: " + tok);
    }
  }

  // Drain remaining ops
  while (ops.length) {
    const op = ops.pop();
    if (op === "(" || op === ")") throw new Error("Mismatched parentheses");
    output.push(op);
  }

  // 6) Evaluate RPN
  const stack = [];
  for (let tok of output) {
    if (typeof tok === "number") {
      stack.push(tok);
    } else if (tok === "%") {
      // postfix percent
      const v = stack.pop();
      if (v === undefined) throw new Error("Invalid expression");
      stack.push(v / 100);
    } else {
      // binary operator
      const b = stack.pop();
      const a = stack.pop();
      if (a === undefined || b === undefined)
        throw new Error("Invalid expression");

      let r;
      switch (tok) {
        case "+":
          r = a + b;
          break;
        case "-":
          r = a - b;
          break;
        case "*":
          r = a * b;
          break;
        case "/":
          if (b === 0) throw new Error("Division by zero");
          r = a / b;
          break;
        case "^":
          r = Math.pow(a, b);
          break;
        default:
          throw new Error("Unsupported operator: " + tok);
      }
      stack.push(r);
    }
  }

  if (stack.length !== 1) throw new Error("Invalid expression");
  return stack[0];
}
