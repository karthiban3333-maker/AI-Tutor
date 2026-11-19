const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const sgMail = require("@sendgrid/mail");

admin.initializeApp();
const db = admin.firestore();

const GEMINI_MODEL = "gemini-2.5-flash";

function getGoogleApiKey() {
    const apiKey = functions.config().google?.key;
    if (!apiKey) throw new Error("Missing google.key config");
    return apiKey;
}

function getGeminiModel(systemInstruction) {
    const genAI = new GoogleGenerativeAI(getGoogleApiKey());
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

    // Gemini requires history to start with a user turn
    while (history.length > 0 && history[0].role !== "user") {
        history.shift();
    }

    return history;
}

async function generateWithGemini(systemInstruction, prompt) {
    const model = getGeminiModel(systemInstruction);
    const result = await model.generateContent(prompt);
    return result.response.text();
}

async function chatWithGemini(systemInstruction, chatHistory, userMessage) {
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

function initSendGrid() {
    const apiKey = functions.config().sendgrid.key;
    if (!apiKey) throw new Error("Missing sendgrid.key config");
    sgMail.setApiKey(apiKey);
}

exports.generateModules = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in");
    }

    const { text, timePreference } = data;
    if (!text) {
        throw new functions.https.HttpsError("invalid-argument", "Text content required");
    }

    try {
        const prompt = `
    You are an AI Tutor creating a study plan.
    User's time preference: ${timePreference || "Flexible"}.
    Given the following document text, break it down into 3-5 logical study modules.
    Return ONLY a valid JSON array of objects, where each object has:
    - "title" (string): A short, descriptive title for the module
    - "content" (string): The key points or summary for this specific module extracted from the text
    
    Document Text:
    ${text.substring(0, 5000)}
    `;

        const responseText = await generateWithGemini(
            "You strictly output JSON arrays without markdown formatting.",
            prompt
        );

        let modulesList = [];
        try {
            modulesList = JSON.parse(stripMarkdownJson(responseText));
        } catch (e) {
            console.error("JSON Parsing Error:", e, "Raw Output:", responseText);
            throw new functions.https.HttpsError("internal", "Failed to parse AI response.");
        }

        return { modules: modulesList };
    } catch (error) {
        console.error(error);
        if (error instanceof functions.https.HttpsError) throw error;
        throw new functions.https.HttpsError("internal", error.message);
    }
});

exports.tutorChat = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in");
    }

    const { moduleContent, userMessage, chatHistory } = data;

    if (!moduleContent || !userMessage) {
        throw new functions.https.HttpsError("invalid-argument", "Module content and message are required");
    }

    try {
        const systemPrompt = `
      You are an interactive AI tutor. You are teaching a student about the following module context:
      "${moduleContent}"
      
      Engage the student. Explain clearly, ask them questions to verify understanding, and be encouraging.
      Keep your responses relatively concise.
    `;

        const response = await chatWithGemini(systemPrompt, chatHistory, userMessage);
        return { response };
    } catch (error) {
        console.error(error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});

exports.evaluateAnswer = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in");
    }

    const { context: contextText, question, studentAnswer } = data;

    try {
        const prompt = `
      Context: ${contextText}
      Tutor Question: ${question}
      Student Answer: ${studentAnswer}
      
      Evaluate the student's answer based on the context. 
      Return ONLY a JSON object with:
      - "score" (number 1-10): How accurate and well-understood the answer is.
      - "feedback" (string): Short feedback to the student.
    `;

        const responseText = await generateWithGemini(
            "You strictly output JSON objects without markdown formatting.",
            prompt
        );

        const result = JSON.parse(stripMarkdownJson(responseText));
        return result;
    } catch (error) {
        console.error(error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});

exports.dailyReminder = functions.pubsub.schedule("every 24 hours").onRun(async (context) => {
    initSendGrid();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
        const usersSnapshot = await db.collection("users").get();

        const emailPromises = [];

        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            if (!userData.lastActiveDate || !userData.email) return;

            const lastActive = new Date(userData.lastActiveDate);
            lastActive.setHours(0, 0, 0, 0);

            const diffTime = Math.abs(today - lastActive);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 1) {
                const msg = {
                    to: userData.email,
                    from: "noreply@ai-tutor-app.xyz",
                    subject: "You missed your study session!",
                    text: `Hi ${userData.name || "Student"},\n\nWe noticed you haven't studied with your AI Tutor today. Keep your streak alive and jump back in!\n\nBest,\nAI Tutor Team`,
                    html: `<strong>Hi ${userData.name || "Student"},</strong><br><br>We noticed you haven't studied with your AI Tutor today. Keep your streak alive and jump back in!<br><br>Best,<br>AI Tutor Team`
                };
                emailPromises.push(sgMail.send(msg));
            }
        });

        await Promise.all(emailPromises);
        console.log(`Sent ${emailPromises.length} reminder emails.`);
    } catch (error) {
        console.error("Error in daily reminder scheduler: ", error);
    }
    return null;
});
