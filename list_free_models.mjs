async function listFreeModels() {
    try {
        const res = await fetch('https://openrouter.ai/api/v1/models');
        const data = await res.json();
        const freeModels = data.data
            .filter(m => m.id.endsWith(':free'))
            .map(m => m.id);
        console.log('Free Models:', JSON.stringify(freeModels, null, 2));
    } catch (e) {
        console.log('Error:', e.message);
    }
}
listFreeModels();
