async function listGroqModels() {
    const apiKey = process.env.GROQ_API_KEY;
    try {
        const response = await fetch('https://api.groq.com/openai/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const data = await response.json();
        console.log(JSON.stringify(data.data.map(m => m.id), null, 2));
    } catch (e) {
        console.log('Error:', e.message);
    }
}
listGroqModels();
