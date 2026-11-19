import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_MODEL = "gemini-2.5-flash";

function getApiKey() {
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    if (!apiKey) {
        throw new Error("Missing Google API key. Add VITE_GOOGLE_API_KEY to your .env file.");
    }
    return apiKey;
}

function getGeminiModel(systemInstruction) {
    const genAI = new GoogleGenerativeAI(getApiKey());
    const options = { model: GEMINI_MODEL };
    if (systemInstruction) {
        options.systemInstruction = systemInstruction;
    }
    return genAI.getGenerativeModel(options);
}

function stripMarkdownJson(text) {
    return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

function toGeminiHistory(chatHistory) {
    const history = (chatHistory || [])
        .filter((msg) => msg.role === "user" || msg.role === "assistant")
        .map((msg) => ({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }],
        }));

    while (history.length > 0 && history[0].role !== "user") {
        history.shift();
    }

    return history;
}

async function generateText(systemInstruction, prompt) {
    const model = getGeminiModel(systemInstruction);
    const result = await model.generateContent(prompt);
    return result.response.text();
}

async function chatWithHistory(systemInstruction, chatHistory, userMessage) {
    const model = getGeminiModel(systemInstruction);
    const history = toGeminiHistory(chatHistory);

    if (history.length === 0) {
        const result = await model.generateContent(userMessage);
        return result.response.text();
    }

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(userMessage);
    return result.response.text();
}

export async function generateModules(text, fileData = null, timePreference = "Flexible") {
    let prompt = `
    You are an AI Tutor creating a study plan.
    User's time preference: ${timePreference}.
    `;

    if (fileData) {
        prompt += `
        Please analyze this image containing handwritten notes, a textbook page, or educational material. Extract and interpret its content, then break it down into 3-5 logical study modules.
        `;
    } else {
        prompt += `
        Given the following document text, break it down into 3-5 logical study modules.
        `;
    }

    prompt += `
    Return ONLY a valid JSON array of objects, where each object has:
    - "title" (string): A short, descriptive title for the module
    - "content" (string): The key points or summary for this specific module extracted from the text. Make sure this content is comprehensive and includes all key terms.
    `;

    if (!fileData) {
        prompt += `
        Document Text:
        ${text.substring(0, 8000)}
        `;
    }

    const model = getGeminiModel("You strictly output JSON arrays without markdown formatting.");
    
    let result;
    if (fileData) {
        const imagePart = {
            inlineData: {
                data: fileData.base64,
                mimeType: fileData.mimeType
            }
        };
        result = await model.generateContent([prompt, imagePart]);
    } else {
        result = await model.generateContent(prompt);
    }

    const responseText = result.response.text();
    return JSON.parse(stripMarkdownJson(responseText));
}


export async function tutorChat(moduleContent, userMessage, chatHistory, socraticMode = false) {
    let systemPrompt = `
      You are an interactive AI tutor. You are teaching a student about the following module context:
      "${moduleContent}"
      
      Engage the student. Explain clearly, ask them questions to verify understanding, and be encouraging.
      Keep your responses relatively concise.
      
      MID-LESSON CHECKPOINTS:
      Every 4-5 turns in the conversation (a turn is 1 message from student, 1 from you), you must test the student's comprehension of the sub-concept you just discussed by asking a quick, clear, single-question comprehension check.
      You MUST prefix your question with '[CHECKPOINT]' so the system knows it is a checkpoint (e.g. '[CHECKPOINT] What is the difference between a stack and a queue?').
      
      When the student replies to a checkpoint question:
      Evaluate their answer in your response. At the very end of your response, you MUST append one of these evaluation tags (including the square brackets):
      - If they answered correctly: '[CHECKPOINT_EVAL: CORRECT]'
      - If they answered incorrectly or struggled: '[CHECKPOINT_EVAL: INCORRECT] Concept: <Name of concept, e.g., Stack vs Queue difference>'
      
      Keep these tags exactly as formatted. They are parsed by the system.
    `;

    if (socraticMode) {
        systemPrompt += `
      CRITICAL RULE (SOCRATIC MODE): Never state the answer directly. If the student asks a question or gets something wrong, do not give them the final answer. Instead, ask guiding questions, point out logical gaps, or give hints that help them figure out the concept themselves. Break down the topic into step-by-step reasoning steps.
        `;
    }

    return chatWithHistory(systemPrompt, chatHistory, userMessage);
}



export async function evaluateAnswer(contextText, question, studentAnswer) {
    const prompt = `
      Context: ${contextText}
      Tutor Question: ${question}
      Student Answer: ${studentAnswer}
      
      Evaluate the student's answer based on the context. 
      Return ONLY a JSON object with:
      - "score" (number 1-10): How accurate and well-understood the answer is.
      - "feedback" (string): Short feedback to the student.
    `;

    const responseText = await generateText(
        "You strictly output JSON objects without markdown formatting.",
        prompt
    );

    return JSON.parse(stripMarkdownJson(responseText));
}

export async function generateFlashcards(moduleContent, struggledConcepts = [], evalFeedback = '') {
    const conceptList = struggledConcepts.length > 0
        ? `The student specifically struggled with: ${struggledConcepts.join(', ')}.`
        : 'Focus on the most important core concepts from this module.';

    const prompt = `
    You are an AI tutor generating spaced-repetition flashcards for a student.
    
    Module Content:
    "${moduleContent.substring(0, 4000)}"
    
    ${conceptList}
    Tutor Evaluation Feedback: "${evalFeedback}"
    
    Generate 3-5 targeted flashcards that focus on the concepts the student found difficult or that are most critical to understand.
    
    Return ONLY a valid JSON array of objects, each with:
    - "front" (string): A clear, focused question or prompt
    - "back" (string): A concise but complete answer (2-3 sentences max)
    `;

    const responseText = await generateText(
        "You strictly output JSON arrays without markdown formatting.",
        prompt
    );

    return JSON.parse(stripMarkdownJson(responseText));
}

