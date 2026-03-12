async function testOpenRouter() {
    const apiKey = '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';
    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'google/gemma-3-27b-it:free',
                messages: [{ role: 'user', content: 'Say hello in one word' }],
            }),
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Success:', data.choices[0].message.content);
        } else {
            const err = await response.text();
            console.log('Error:', err);
        }
    } catch (e) {
        console.log('Exception:', e.message);
    }
}

testOpenRouter();
