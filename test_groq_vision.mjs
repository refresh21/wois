async function testGroqVision() {
    const apiKey = process.env.GROQ_API_KEY;
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-4-scout-17b-16e-instruct',
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: 'What is in' },
                            { type: 'image_url', image_url: { url: 'https://groq.com/wp-content/uploads/2024/03/Groq_Logo_Full_Wh.png' } }
                        ]
                    }
                ],
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

testGroqVision();
