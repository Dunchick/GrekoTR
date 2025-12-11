// netlify/functions/translate.js

// Используем 'node-fetch' (требует package.json в корне)
const fetch = require('node-fetch');

// --- НАСТРОЙКИ API (Используем переменные Netlify) ---
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY; // <-- КЛЮЧ БЕРЕТСЯ ЗДЕСЬ ИЗ NETLIFY!
const RAPIDAPI_HOST = "translateai.p.rapidapi.com"; // <-- Это имя хоста
const API_URL = "https://" + RAPIDAPI_HOST + "/google/translate/json";

// Главный обработчик для Netlify Function
exports.handler = async (event, context) => {
    
    // --- 1. Проверка и получение данных с Фронтенда ---
    if (event.httpMethod !== 'POST' || !event.body) {
        return { 
            statusCode: 405, 
            body: JSON.stringify({ error: "Method Not Allowed or missing body" }) 
        };
    }

    let data;
    try {
        data = JSON.parse(event.body);
    } catch (e) {
        return { 
            statusCode: 400, 
            body: JSON.stringify({ error: "Invalid JSON format" }) 
        };
    }

    const { text } = data; 
    
    if (!text) {
        return { 
            statusCode: 400, 
            body: JSON.stringify({ error: "Missing text parameter" }) 
        };
    }

    // Проверка, что ключ доступен функции
    if (!RAPIDAPI_KEY) {
         return { 
            statusCode: 500, 
            body: JSON.stringify({ error: "API Key not configured in Netlify Environment Variables. Check RAPIDAPI_KEY." }) 
        };
    }


    // --- 2. Формирование запроса к RapidAPI ---
    const bodyPayload = {
        origin_language: 'en',
        target_language: 'ru', 
        words_not_to_translate: 'Greko; New York',
        json_content: {
            user_input: text 
        }
    };
    
    const options = {
        method: 'POST',
        headers: {
            // ИСПОЛЬЗУЕМ ХОСТ
            'x-rapidapi-host': RAPIDAPI_HOST, 
            'Content-Type': 'application/json',
            // ИСПОЛЬЗУЕМ ПЕРЕМЕННУЮ КЛЮЧА
            'x-rapidapi-key': RAPIDAPI_KEY // <-- ИСПОЛЬЗУЕМ ПЕРЕМЕННУЮ NETLIFY!
        },
        body: JSON.stringify(bodyPayload)
    };

    try {
        // --- 3. Вызов RapidAPI ---
        const response = await fetch(API_URL, options);
        const resultData = await response.json();
        
        if (!response.ok || resultData.error) {
            console.error("RapidAPI Error:", resultData.error || `Status: ${response.status}`);
             return {
                statusCode: 500,
                body: JSON.stringify({ error: `Internal server error during translation.` }) // Упрощенное сообщение об ошибке
            };
        }
        
        // --- 4. Извлечение переведенного текста ---
        const translatedText = resultData.translated_content.user_input;
        
        // 5. Возврат результата на Фронтенд
        return {
            statusCode: 200,
            body: JSON.stringify({ translatedText })
        };

    } catch (error) {
        console.error("Function fetch error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal server error during translation." })
        };
    }
};