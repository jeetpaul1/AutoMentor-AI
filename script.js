const geminiApiKey = "AIzaSyCh2YvRKdLwKOGRskkTa6mo7tAy38v8Ldg";
const openaiApiKey = "sk-VKxwkOTXPRxyvOy5TDbf1rdIr9IomNXX3s2xdNTonVHse4ML";
const baseOpenAI = "https://api.chatanywhere.tech/v1";
let isPremium = localStorage.getItem("isPremium") === "true";

if (isPremium) enablePremiumUI();
document.getElementById("questionCount").value = localStorage.getItem("questionCount") || "3";
document.getElementById("questionCount").addEventListener("change", e => {
  localStorage.setItem("questionCount", e.target.value);
});

function unlockPremium() {
  const enteredCode = document.getElementById("premiumCode").value.trim();
  const correctCode = "mentor123";
  if (enteredCode === correctCode) {
    isPremium = true;
    localStorage.setItem("isPremium", "true");
    enablePremiumUI();
  } else {
    alert("Invalid premium code.");
  }
}

function enablePremiumUI() {
  document.getElementById("premiumStatus").innerText = "✨ Premium Unlocked!";
  document.querySelectorAll("#questionCount option").forEach(opt => opt.disabled = false);
}

document.getElementById("submitBtn").addEventListener("click", async () => {
  const userInput = document.getElementById("userInput").value.trim();
  const provider = document.getElementById("aiSelect")?.value || "gemini";
  const count = parseInt(document.getElementById("questionCount").value);
  if (!userInput) return alert("Please enter a topic first!");
  if (!isPremium && count > 3) return alert("This feature is for premium users only.");

  document.getElementById("explanation").innerText = "Generating explanation...";
  document.getElementById("quiz").innerText = "Generating quiz...";
  document.getElementById("scoreDisplay").innerText = "";
  document.getElementById("progressBarContainer").style.display = "block";
  startProgressBar(60);

  const explanationPrompt = `Explain this like I'm a beginner: ${userInput}. Do not use bold or highlighted fonts.`;
  const quizPrompt = `The user wants to learn about: "${userInput}". Generate ${count} beginner-level MCQs (4 options each) on this topic. Provide answers and a 1-line explanation per question. Format: "1. Question\\nA. Option\\nB. Option\\n...\\nAnswer: X\\nExplanation: ..."`;


  try {
    const explanation = provider === "gemini"
      ? await fetchGemini(explanationPrompt)
      : await fetchOpenAI(explanationPrompt);

    const quiz = provider === "gemini"
      ? await fetchGemini(quizPrompt)
      : await fetchOpenAI(quizPrompt);

    document.getElementById("explanation").innerText = explanation;
    document.getElementById("quiz").innerText = quiz;
    setTimeout(transformQuizToInteractive, 100);
  } catch (err) {
    document.getElementById("explanation").innerText = "❌ Error. Please try again.";
    document.getElementById("quiz").innerText = "";
    console.error(err);
  }
});

// function startProgressBar(seconds) {
//   const bar = document.getElementById("progressBar");
//   let timeLeft = seconds;
//   bar.style.width = "100%";

//   const interval = setInterval(() => {
//     timeLeft--;
//     const widthPercent = (timeLeft / seconds) * 100;
//     bar.style.width = widthPercent + "%";
//     if (timeLeft <= 0) {
//       clearInterval(interval);
//       submitAllAnswers();
//       bar.style.backgroundColor = "red";
//     }
//   }, 1000);
// }

async function fetchGemini(prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    }
  );
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Gemini error.";
}

async function fetchOpenAI(prompt) {
  const res = await fetch(`${baseOpenAI}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${openaiApiKey}`
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful AI mentor for beginners." },
        { role: "user", content: prompt }
      ]
    })
  });
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "OpenAI error.";
}

function toggleDarkMode() {
  const isLight = document.body.classList.toggle('light-mode');
  document.querySelector('.container').classList.toggle('light-mode');
  document.querySelectorAll('.output').forEach(e => e.classList.toggle('light-mode'));

  // Optionally update the button icon/text
  const button = document.querySelector('#modeToggle');
  button.textContent = isLight ? '🌙' : '☀️';
}


function copyContent() {
  const explanation = document.getElementById("explanation").innerText;
  const quiz = document.getElementById("quiz").innerText;
  navigator.clipboard.writeText(explanation + "\n\n" + quiz);
}

function saveContent() {
  const explanation = document.getElementById("explanation").innerText;
  const quiz = document.getElementById("quiz").innerText;
  const feedbacks = [...document.querySelectorAll('[id^="feedback"]')].map(f => f.innerText).join("\n");
  const blob = new Blob([explanation + "\n\n" + quiz + "\n\n" + feedbacks], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'AutoMentor_Answers.txt';
  a.click();
}

let isPaused = false;
let progressBarInterval = null; // Store the interval for progress bar

// ///////////

async function transformQuizToInteractive() {
const rawQuiz = document.getElementById("quiz").innerText;
const questions = rawQuiz.split(/(?:^|\n)(?=\d+\.\s)/);

const interactiveHTML = questions.map((q, i) => {
const lines = q.trim().split("\n");
const questionText = lines[0]?.replace(/^\d+\.\s*/, '');
const options = lines.slice(1, 5);
const answerLine = lines.find(line => /Answer\s*[:\-]/i.test(line));
const explanationLine = lines.find(line => /Explanation\s*[:\-]/i.test(line));
const correctAnswer = answerLine?.match(/[A-D]/i)?.[0];
const explanationText = explanationLine?.replace(/Explanation\s*[:\-]/i, '').trim();

if (!questionText || options.length < 4 || !correctAnswer) return '';

const radioOptions = options.map((opt, idx) => {
  const optLetter = String.fromCharCode(65 + idx);
  return `<label><input type="radio" name="q${i}" value="${optLetter}" /> ${opt}</label>`;
}).join('');

return `
  <div class="question-block" id="question${i}">
    <p><strong>Q${i + 1}:</strong> ${questionText}</p>
    ${radioOptions}
    <button onclick="checkAnswer(${i}, '${correctAnswer.toUpperCase()}', \`${explanationText || ''}\`)">Check Answer</button>
    <p class="feedback" id="feedback${i}"></p>
  </div>`;
}).join('');

// Insert the quiz HTML into the page
document.getElementById("quiz").innerHTML = interactiveHTML;

// Use a timeout to start the progress bar after the quiz is rendered
setTimeout(() => {
startProgressBar(60); // Start the progress bar 100ms after the quiz is rendered
}, 100);  // Adjust delay as needed
}

function startProgressBar(seconds) {
const bar = document.getElementById("progressBar");
let timeLeft = seconds;
bar.style.width = "100%";

progressBarInterval = setInterval(() => {
if (isPaused) {
  clearInterval(progressBarInterval); // Stop the progress bar if paused
} else {
  timeLeft--;
  const widthPercent = (timeLeft / seconds) * 100;
  bar.style.width = widthPercent + "%";
  if (timeLeft <= 0) {
    clearInterval(progressBarInterval);
    submitAllAnswers();
    bar.style.backgroundColor = "red";
  }
}
}, 1000);
}

// pause btn

document.getElementById("pauseBtn").addEventListener("click", () => {
isPaused = !isPaused;
const pauseBtn = document.getElementById("pauseBtn");

if (isPaused) {
pauseBtn.innerText = "▶ Resume";
blurQuiz(true); // Blur the quiz when paused
} else {
pauseBtn.innerText = "⏸ Pause";
blurQuiz(false); // Remove blur when resumed
startProgressBar(60); // Resume the progress bar
}
});

// blur
function blurQuiz(blur) {
const quizElements = document.querySelectorAll(".question-block");
quizElements.forEach(el => {
el.style.filter = blur ? "blur(5px)" : "none"; // Apply blur only to questions
});
}


function submitAllAnswers() {
let correct = 0;
document.querySelectorAll('[id^="feedback"]').forEach((fb, i) => {
const btn = fb.previousElementSibling;
if (btn?.onclick) btn.onclick();
});
document.querySelectorAll('[id^="feedback"]').forEach(fb => {
if (fb.innerText.includes("✅ Correct")) correct++;
});
const total = document.querySelectorAll('.question-block').length;
document.getElementById("scoreDisplay").innerText = `Score: ${correct} / ${total}`;
}



window.checkAnswer = function(qIndex, correctLetter, explanation) {
  const selected = document.querySelector(`input[name="q${qIndex}"]:checked`);
  const feedback = document.getElementById(`feedback${qIndex}`);
  if (!selected) {
    feedback.innerHTML = "⚠️ Please select an option.";
    feedback.style.color = "orange";
    return;
  }
  if (selected.value === correctLetter) {
    feedback.innerHTML = `✅ Correct!<br><i>${explanation}</i>`;
    feedback.style.color = "limegreen";
  } else {
    feedback.innerHTML = `❌ Incorrect. Correct answer is ${correctLetter}.<br><i>${explanation}</i>`;
    feedback.style.color = "crimson";
  }
};

function submitAllAnswers() {
  let correct = 0;
  document.querySelectorAll('[id^="feedback"]').forEach((fb, i) => {
    const btn = fb.previousElementSibling;
    if (btn?.onclick) btn.onclick();
  });
  document.querySelectorAll('[id^="feedback"]').forEach(fb => {
    if (fb.innerText.includes("✅ Correct")) correct++;
  });
  const total = document.querySelectorAll('.question-block').length;
  document.getElementById("scoreDisplay").innerText = `Score: ${correct} / ${total}`;
}


// speak

let isSpeaking = false;
let currentUtterance = null;
let currentIndex = 0;
let sentenceList = [];

// === TEXT-TO-SPEECH ===
function speakText() {
const speakBtn = document.getElementById("speakBtn");
const textToSpeak = document.getElementById("explanation").innerText.trim();

if (!textToSpeak) {
    alert("There is no text to speak.");
    return;
}

// Stop speaking if already speaking
if (isSpeaking) {
    speechSynthesis.cancel();
    isSpeaking = false;
    speakBtn.innerText = "🔊 Speak Text";
    return;
}

// Split text into sentences
if (sentenceList.length === 0) {
    sentenceList = textToSpeak.match(/[^.!?]+[.!?]*/g) || [textToSpeak];
    currentIndex = 0;
}

function speakNextSentence() {
    if (currentIndex >= sentenceList.length) {
        isSpeaking = false;
        currentIndex = 0;
        sentenceList = [];
        speakBtn.innerText = "🔊 Speak Text";
        return;
    }

    const sentence = sentenceList[currentIndex].trim();
    if (!sentence) {
        currentIndex++;
        speakNextSentence();
        return;
    }

    currentUtterance = new SpeechSynthesisUtterance(sentence);
    currentUtterance.lang = "en-US";
    currentUtterance.pitch = 1;
    currentUtterance.rate = 1;

    currentUtterance.onstart = () => {
        isSpeaking = true;
        speakBtn.innerText = "🛑 Stop Speaking";
    };

    currentUtterance.onend = () => {
        if (isSpeaking) {
            currentIndex++;
            speakNextSentence();
        }
    };

    speechSynthesis.speak(currentUtterance);
}

speakNextSentence();
}

// === SPEECH-TO-TEXT ===
function startVoiceInput() {
if (!('webkitSpeechRecognition' in window)) {
    alert("Speech recognition not supported in this browser.");
    return;
}

const recognition = new webkitSpeechRecognition();
recognition.continuous = false;
recognition.interimResults = false;
recognition.lang = "en-US";

recognition.onstart = () => {
    console.log("Voice recognition started...");
};

recognition.onerror = (event) => {
    console.error("Speech recognition error", event);
};

recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    document.getElementById("userInput").innerText = transcript;
};

recognition.start();
}
