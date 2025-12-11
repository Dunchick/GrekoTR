// Используем 'node-fetch' для отправки HTTP-запросов (так как это Node.js окружение)
// Примечание: 'node-fetch' необходимо установить в проекте, если вы запускаете локально.
// Netlify Functions обычно предоставляют его по умолчанию.
const fetch = require('node-fetch');

// API-ключ берется из переменных окружения Netlify!
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY; 
const RAPIDAPI_HOST = "translateai.p.rapidapi.com";
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

    // Извлекаем текст, который нужно перевести (с фронтенда)
    const { text } = data; 
    
    if (!text) {
        return { 
            statusCode: 400, 
            body: JSON.stringify({ error: "Missing text parameter" }) 
        };
    }

    if (!RAPIDAPI_KEY) {
         return { 
            statusCode: 500, 
            body: JSON.stringify({ error: "API Key not configured in Netlify Environment Variables." }) 
        };
    }


    // --- 2. Формирование запроса к RapidAPI на основе вашей структуры ---
    
    // ВАЖНО: Мы заменяем 'bn' (бенгальский) на 'ru' (русский), 
    // и используем только минимальную обертку для передачи текста пользователя.
    
    const bodyPayload = {
        origin_language: 'en',
        target_language: 'ru', // Изменено на Русский
        words_not_to_translate: 'Greko; New York', // Добавлено Greko
        // paths_to_exclude: 'product.media.img_desc', // Этот ключ не нужен, если мы не переводим сложный JSON
        // common_keys_to_exclude: 'name; price', // Этот ключ не нужен, если мы не переводим сложный JSON
        json_content: {
            // Оборачиваем наш текст в простой объект, чтобы API мог его обработать
            user_input: text 
        }
    };
    
    const options = {
        method: 'POST',
        headers: {
            'x-rapidapi-host': RAPIDAPI_HOST,
            'Content-Type': 'application/json',
            // Добавляем наш секретный ключ, который скрыт в Netlify
            'x-rapidapi-key': RAPIDAPI_KEY 
        },
        body: JSON.stringify(bodyPayload) // Тело должно быть строкой JSON
    };

    try {
        // --- 3. Вызов RapidAPI ---
        const response = await fetch(API_URL, options);
        const resultData = await response.json();
        
        if (!response.ok || resultData.error) {
            console.error("RapidAPI Error:", resultData.error || `Status: ${response.status}`);
             return {
                statusCode: 500,
                body: JSON.stringify({ error: `Translation API error: ${resultData.error || 'Server responded with error.'}` })
            };
        }
        
        // --- 4. Извлечение переведенного текста ---
        // Поскольку мы отправили текст под ключом 'user_input', 
        // мы ожидаем получить его обратно под тем же ключом.
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