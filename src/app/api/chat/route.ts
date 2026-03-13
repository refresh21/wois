import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    try {
        const { messages, context } = await req.json()

        if (!process.env.OPENROUTER_API_KEY) {
            console.error('OPENROUTER_API_KEY is missing')
            return NextResponse.json({ error: 'OpenRouter API Key defined değil' }, { status: 500 })
        }

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Invalid messages' }, { status: 400 })
        }

        console.log('Chat API Request (OpenRouter):', { 
            messageCount: messages.length, 
            contextCount: context?.length || 0 
        })

        // Construct context string from selected transcripts
        const contextString = context && Array.isArray(context) && context.length > 0
            ? `\n\nHafızadan seçilen notların içeriği şu şekildedir:\n---\n${context.join('\n\n---\n')}\n---`
            : ''

        const systemPrompt = `Sen Wois uygulamasının "Voice Asistanı" asistanısın. Görevin, kullanıcının seçtiği ses kayıtları ve notlar üzerinden derinlemesine analizler yapmak, ona bu konuları öğretmek ve sorularını yanıtlamaktır.

${contextString}

Kullanıcı ile her zaman TÜRKÇE konuş. Yanıtlarını verirken:
1. Seçilen notlardaki spesifik bilgilere atıfta bulun.
2. Karmaşık konuları basitleştirerek açıkla.
3. Analitik ve öğretici bir ton kullan.
4. Eğer seçilen notlarda bir bilgi yoksa, genel bilgini kullanabilirsin ama bunu belirterek "Seçilen notlarda bu geçmiyor ancak genel olarak..." şeklinde ifade et.
5. Hazırladığın başlıklarda ve önemli kelimelerde **kalın (bold)** yazım stilini kullan (Örn: **Konu Başlığı**). 

Senin adın Voice Asistanı.`

        console.log('Calling OpenRouter Chat...')
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-3.1-8b-instruct:free',
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages
                ],
            }),
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Could not parse error JSON' }))
            console.error('OpenRouter Chat Error:', JSON.stringify(errorData, null, 2))
            
            // Helpful message for rate limit and other common errors in Turkish
            if (response.status === 429) {
                return NextResponse.json({ 
                    error: 'Hız Sınırı Aşıldı',
                    message: 'AI şu an çok meşgul. Lütfen bir dakika bekleyip tekrar dene.' 
                }, { status: 429 })
            }

            if (response.status === 401 || response.status === 403) {
                return NextResponse.json({ 
                    error: 'Yetkilendirme Hatası',
                    message: 'API anahtarı geçersiz veya yetkisiz. Lütfen yöneticiye danışın.' 
                }, { status: response.status })
            }

            if (response.status === 404) {
                return NextResponse.json({ 
                    error: 'Model Bulunamadı',
                    message: 'Seçilen AI modeli şu an kullanım dışı. Lütfen daha sonra tekrar deneyin.' 
                }, { status: 404 })
            }

            return NextResponse.json({ 
                error: 'AI Error', 
                message: 'AI yanıt verirken beklenmedik bir hata oluştu.',
                details: errorData 
            }, { status: response.status })
        }

        const data = await response.json()
        const assistantMessage = data.choices?.[0]?.message?.content || 'Üzgünüm, bir hata oluştu.'

        return NextResponse.json({ message: assistantMessage })
    } catch (error: any) {
        console.error('Chat error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
