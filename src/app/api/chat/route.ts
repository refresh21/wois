import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    try {
        const { messages, context } = await req.json()

        if (!process.env.GROQ_API_KEY) {
            console.error('GROQ_API_KEY is missing')
            return NextResponse.json({ error: 'Groq API Key defined değil' }, { status: 500 })
        }

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Invalid messages' }, { status: 400 })
        }

        console.log('Chat API Request (Groq):', { 
            messageCount: messages.length, 
            contextCount: context?.length || 0 
        })

        // Construct context string from selected transcripts
        const contextString = context && Array.isArray(context) && context.length > 0
            ? `\n\nHafızadan seçilen notların içeriği şu şekildedir:\n---\n${context.join('\n\n---\n')}\n---`
            : ''

        const systemPrompt = `Sen Wois uygulamasının "AI Eğitmeni" (AI Tutor) asistanısın. Görevin, kullanıcının seçtiği ses kayıtları ve notlar üzerinden derinlemesine analizler yapmak, ona bu konuları öğretmek ve sorularını yanıtlamaktır.

${contextString}

Kullanıcı ile her zaman TÜRKÇE konuş. Yanıtlarını verirken:
1. Seçilen notlardaki spesifik bilgilere atıfta bulun.
2. Karmaşık konuları basitleştirerek açıkla.
3. Analitik ve öğretici bir ton kullan.
4. Eğer seçilen notlarda bir bilgi yoksa, genel bilgini kullanabilirsin ama bunu belirterek "Seçilen notlarda bu geçmiyor ancak genel olarak..." şeklinde ifade et.
5. Markdown formatını kullan, önemli kısımları **kalın** yap.

Senin adın Wois AI.`

        console.log('Calling Groq Chat...')
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages
                ],
            }),
        })

        if (!groqResponse.ok) {
            const errorData = await groqResponse.json().catch(() => ({ error: 'Could not parse error JSON' }))
            console.error('Groq Chat Error:', JSON.stringify(errorData, null, 2))
            return NextResponse.json({ 
                error: 'AI Error', 
                details: errorData 
            }, { status: groqResponse.status })
        }

        const data = await groqResponse.json()
        const assistantMessage = data.choices?.[0]?.message?.content || 'Üzgünüm, bir hata oluştu.'

        return NextResponse.json({ message: assistantMessage })
    } catch (error: any) {
        console.error('Chat error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
