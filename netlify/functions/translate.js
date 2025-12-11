// netlify/functions/translate.js
const fetch = require('node-fetch');

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY; 
const RAPIDAPI_HOST = "translateai.p.rapidapi.com";
const API_URL = "https://" + RAPIDAPI_HOST + "/google/translate/json";

exports.handler = async (event, context) => {
    
    // ... (Проверки: POST, event.body, data, text) ...
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

    if (!RAPIDAPI_KEY) {
         return { 
            statusCode: 500, 
            body: JSON.stringify({ error: "API Key not configured in Netlify Environment Variables. Check RAPIDAPI_KEY." }) 
        };
    } else {
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
        const response = await fetch(API_URL, options);
        
        // ПРОВЕРКА 1: ЕСЛИ API ОТВЕТИЛ ОШИБКОЙ HTTP (например, 403, 404)
        if (!response.ok) {
            let errorText = await response.text();
            console.error(`DEBUG: RapidAPI ответил HTTP-ошибкой: ${response.status}. Тело: ${errorText.substring(0, 150)}`);
            
            // Пытаемся распарсить JSON, если он есть
            try {
                const errorData = JSON.parse(errorText);
                errorText = errorData.error || errorData.message || errorText;
            } catch (e) {
                // Если не JSON
            }
            
            return {
                statusCode: 500,
                body: JSON.stringify({ error: `Translation API error: ${errorText || 'HTTP error.'}` })
            };
        }

        // ПРОВЕРКА 2: Если HTTP OK, парсим JSON
        const resultData = await response.json();
        
        // ПРОВЕРКА 3: Проверяем, что в JSON есть ожидаемое поле
        if (resultData.translated_content && resultData.translated_content.user_input) {
            const translatedText = resultData.translated_content.user_input;
            
            return {
                statusCode: 200,
                body: JSON.stringify({ translatedText })
            };
        } else {
            // Если ответ OK, но неверный формат (например, API изменился)
            console.error("DEBUG: RapidAPI вернул невалидный JSON. Получено:", JSON.stringify(resultData).substring(0, 150));
             return {
                statusCode: 500,
                body: JSON.stringify({ error: `Translation API error: Неверный формат ответа API.` })
            };
        }

    } catch (error) {
        console.error("Function fetch error (Network/Parsing):", error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal server error during translation." })
        };
    }
};