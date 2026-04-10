import fs from 'fs/promises';
import path from 'path';
import { AzureOpenAI } from 'openai';

const client = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION,
  deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
});

const DATA_DIR = path.join(__dirname, '../src/data/destinations');

async function migrate() {
    const files = await fs.readdir(DATA_DIR);
    const restaurantFiles = files.filter(f => f.endsWith('_restaurants.json'));

    for (const file of restaurantFiles) {
        console.log(`Processing ${file}...`);
        const filePath = path.join(DATA_DIR, file);
        const data = await fs.readFile(filePath, 'utf-8');
        
        let restaurants: any[];
        try {
            restaurants = JSON.parse(data);
        } catch (e) {
            console.error(`Failed to parse ${file}`);
            continue;
        }

        // Check if already migrated
        if (restaurants.length > 0 && 'isPureVeg' in restaurants[0]) {
            console.log(`Already migrated ${file}, skipping.`);
            continue;
        }

        const prompt = `You are a culinary expert in India. I have a list of restaurants.
For each restaurant name and cuisine, provide a JSON array answering two questions:
1. isPureVeg: true if ONLY vegetarian food is served. false if they serve ANY non-veg.
2. hasJainFood: true if they offer Jain-friendly items (no onion, garlic, or root vegetables).

Input Restaurants:
${JSON.stringify(restaurants.map(r => ({ name: r.name, cuisine: r.cuisine })), null, 2)}

Respond ONLY with a raw JSON array matching the exact order of the input.
Schema of each object in the array:
{
  "isPureVeg": boolean,
  "hasJainFood": boolean
}`;

        try {
            const response = await client.chat.completions.create({
                model: process.env.AZURE_OPENAI_DEPLOYMENT as string,
                messages: [{ role: 'system', content: prompt }],
                temperature: 0.1,
            });

            let rawJson = response.choices[0]?.message?.content || '[]';
            rawJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();

            const answers = JSON.parse(rawJson);

            if (answers.length !== restaurants.length) {
                console.error(`Length mismatch for ${file}. Expected ${restaurants.length}, got ${answers.length}. Skipping.`);
                continue;
            }

            for (let i = 0; i < restaurants.length; i++) {
                restaurants[i].isPureVeg = answers[i].isPureVeg ?? false;
                restaurants[i].hasJainFood = answers[i].hasJainFood ?? false;
            }

            await fs.writeFile(filePath, JSON.stringify(restaurants, null, 2));
            console.log(`Migrated ${file}`);
        } catch (e: any) {
            console.error(`LLM failed for ${file}:`, e.message);
        }
    }
    console.log('Migration complete.');
}

migrate();
