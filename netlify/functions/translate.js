// netlify/functions/translate.js
const fetch = require('node-fetch');

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY; // Ключ из переменных окружения Netlify
const RAPIDAPI_HOST = "translateai.p.rapidapi.com";
const API_URL = "https://" + RAPIDAPI_HOST + "/google/translate/json";

exports.handler = async (event, context) => {
    
    // Проверка POST и тела запроса
    if (event.httpMethod !== 'POST' || !event.body) {
        return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed or missing body" }) };
    }

    let data;
    try {
        data = JSON.parse(event.body);
    } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON format" }) };
    }

    const { text } = data; 
    
    if (!text) {
        return { statusCode: 400, body: JSON.stringify({ error: "Missing text parameter" }) };
    }

    // --- DEBUG LOGGING: Проверка наличия ключа ---
    if (!RAPIDAPI_KEY) {
         console.error("DEBUG: RAPIDAPI_KEY отсутствует в переменных окружения Netlify.");
         return { 
            statusCode: 500, 
            body: JSON.stringify({ error: "API Key not configured in Netlify Environment Variables. Check RAPIDAPI_KEY." }) 
        };
    } else {
         // Логируем первые символы ключа, чтобы убедиться, что он есть
         console.log(`DEBUG: RAPIDAPI_KEY присутствует (начинается с: ${RAPIDAPI_KEY.substring(0, 5)}...)`);
    }

    // --- Формирование запроса ---
    const bodyPayload = {
        origin_language: 'en',
        target_language: 'ru', 
        words_not_to_translate: 'Greko; New York',
        json_content: { user_input: text }
    };
    
    const options = {
        method: 'POST',
        headers: {
            'x-rapidapi-host': RAPIDAPI_HOST, 
            'Content-Type': 'application/json',
            'x-rapidapi-key': RAPIDAPI_KEY
        },
        body: JSON.stringify(bodyPayload)
    };

    try {
        // --- 3. Вызов RapidAPI ---
        const response = await fetch(API_URL, options);
        const resultData = await response.json();
        
        if (!response.ok) {
            // --- DEBUG LOGGING: Логируем статус ошибки RapidAPI ---
            console.error(`DEBUG: RapidAPI ответил со статусом: ${response.status}`);
            console.error("DEBUG: RapidAPI Тело ошибки:", resultData);
            
            const apiErrorMessage = resultData.error || `Server responded with status ${response.status}.`;
            return {
                statusCode: 500,
                body: JSON.stringify({ error: `Translation API error: ${apiErrorMessage}` })
            };
        }
        
        // ... (Успешная обработка ответа)
        const translatedText = resultData.translated_content.user_input;
        
        return {
            statusCode: 200,
            body: JSON.stringify({ translatedText })
        };

    } catch (error) {
        console.error("Function fetch error (Network/Timeout):", error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal server error during translation." })
        };
    }
};