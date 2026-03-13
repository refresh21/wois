import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    try {
        const { text, mediaUrl } = await req.json()

        if (!text && !mediaUrl) {
            return NextResponse.json({ error: 'No text or media provided' }, { status: 400 })
        }

        const messages: any[] = [
            {
                role: 'system',
                content: `Sen profesyonel bir analiz asistanısın. Gelen metni veya görseli inceleyerek ÇOK DETAYLI, UZUN ve KAPSAMLI bir özet çıkaracaksın. 
Özeti yüzeysel yapmaktan kaçın, metindeki veya görseldeki tüm ince detayları, argümanları ve vurguları yakala.
Ayrıca, en önemli kısımları **kalın (bold)** metinlerle vurgula ki okuyucunun dikkatini hemen çeksin.

Lütfen aşağıdaki yapıyı tam olarak takip ederek raporunu oluştur:
1. **Genel Bakış** - Konunun veya belgenin ne hakkında olduğuyla ilgili kapsamlı ve detaylı bir giriş.
2. **Önemli Detaylar ve Gözlemler** - Söylenenler, tartışılan konular, rakamlar, isimler, alınan kararlar veya görseldeki belirgin/önemli objeler. En kritik noktaları **vurgulayarak** yaz.
3. **Sonuç ve Sonraki Adımlar** - Çıkarılabilecek nihai anlamlar, özetleyici ana fikir veya geleceğe yönelik aksiyonlar, yapılması gerekenler.
4. **Anahtar Kelimeler ve Açıklamaları** - Metnin veya görselin temelini oluşturan anahtar kelimeleri (key words) listele ve her bir anahtar kelimenin o bağlamda neye vurgu yaptığını, neden önemli olduğunu kısa bir açıklama ile belirt.

Cevap dilin HER ZAMAN TÜRKÇE olmalıdır. Lütfen sıradan bir özet yerine analitik, yapılandırılmış ve derinlemesine bir metin üret.`
            }
        ]

        if (mediaUrl) {
            messages.push({
                role: 'user',
                content: [
                    { type: "text", text: text ? `Şu metni ve görseli detaylıca analiz et:\n\n${text}` : "Lütfen bu görseli detaylıca analiz et ve açıkla:" },
                    { type: "image_url", image_url: { url: mediaUrl } }
                ]
            })
        } else {
            messages.push({
                role: 'user',
                content: `Şu metni detaylıca özetle:\n\n${text}`
            })
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://wois.vercel.app',
                'X-Title': 'Wois AI',
            },
            body: JSON.stringify({
                model: 'openrouter/free',
                messages: messages,
            }),
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => null)
            const errorText = errorData ? JSON.stringify(errorData) : await response.text()
            console.error('OpenRouter Summary error:', errorText)
            return NextResponse.json({ 
                error: 'Summarization failed', 
                message: `Özetleme sırasında bir hata oluştu (Kod: ${response.status}). Lütfen tekrar deneyin.`,
                details: errorText 
            }, { status: response.status })
        }

        const data = await response.json()
        const summary = data.choices?.[0]?.message?.content || 'No summary generated'

        return NextResponse.json({ summary })
    } catch (error: any) {
        console.error('Summarization error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
