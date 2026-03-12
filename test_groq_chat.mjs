async function testGroqChat() {
    const apiKey = process.env.GROQ_API_KEY;
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: 'Say hello in Turkish' }],
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

testGroqChat();
