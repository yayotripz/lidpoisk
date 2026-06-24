import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  getNicheLabel,
  getCountryLabel,
  getProblemLabel,
} from "@/lib/constants"
import { parseProblems } from "@/lib/leads"

export const dynamic = "force-dynamic"
export const maxDuration = 30

// POST /api/generate-message
// Принимает: { leadId: string } или { lead: {...} }
// Возвращает: { message, subject, services, source: "ai" | "template" }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))

    let lead: {
      companyName: string
      niche: string
      country: string
      city: string
      problems: string[]
      rating: number
      reviewsCount: number
      website: string | null
      phone: string | null
    }

    if (body.leadId) {
      const row = await db.lead.findUnique({ where: { id: body.leadId } })
      if (!row) {
        return NextResponse.json({ error: "Лид не найден" }, { status: 404 })
      }
      lead = {
        companyName: row.companyName,
        niche: row.niche,
        country: row.country,
        city: row.city,
        problems: parseProblems(row.problems),
        rating: row.rating,
        reviewsCount: row.reviewsCount,
        website: row.website,
        phone: row.phone,
      }
    } else if (body.lead) {
      lead = body.lead
      lead.problems = Array.isArray(lead.problems) ? lead.problems : []
    } else {
      return NextResponse.json({ error: "Требуется leadId или lead" }, { status: 400 })
    }

    // Формируем описание проблем
    const problemLabels = lead.problems.map(getProblemLabel)
    const problemsText =
      problemLabels.length > 0
        ? problemLabels.join(", ")
        : "явных проблем не обнаружено"

    // Определяем, какие услуги предложить на основе проблем
    const services: string[] = []
    if (lead.problems.includes("no_website")) {
      services.push("разработка современного сайта")
    }
    if (lead.problems.includes("no_telegram")) {
      services.push("создание Telegram-бота для приёма заявок")
    }
    if (lead.problems.includes("no_whatsapp")) {
      services.push("WhatsApp-автоматизация общения с клиентами")
    }
    if (lead.problems.includes("bad_maps_card") || lead.problems.includes("few_reviews")) {
      services.push("улучшение онлайн-упаковки и карточек в картах")
    }
    if (services.length === 0) {
      services.push("разработка сайта", "создание Telegram-бота", "автоматизация записи")
    }

    const nicheLabel = getNicheLabel(lead.niche)
    const countryLabel = getCountryLabel(lead.country)

    // Пытаемся сначала z-ai SDK (если доступен)
    let aiMessage: string | null = null
    let aiSubject: string | null = null
    try {
      const ZAIModule = await import("z-ai-web-dev-sdk")
      const ZAI = ZAIModule.default
      const zai = await ZAI.create()

      const systemPrompt = `Ты — профессиональный продажник B2B для веб-агентства. Пишешь короткие, персонализированные сообщения для холодного аутрича в WhatsApp/Telegram компаниям из СНГ. Стиль: дружелюбный, конкретный, без воды. Сообщение должно быть коротким (3-5 предложений), на «вы», с конкретным предложением на основе проблем компании. Используй русский язык.`

      const userPrompt = `Напиши персонализированное сообщение для холодного аутрича.

Данные о компании:
- Название: ${lead.companyName}
- Ниша: ${nicheLabel}
- Город: ${lead.city}, ${countryLabel}
- Рейтинг: ${lead.rating > 0 ? lead.rating.toFixed(1) : "нет"} (${lead.reviewsCount} отзывов)
- Найденные проблемы: ${problemsText}
- Сайт: ${lead.website ? "есть" : "НЕТ"}

Услуги, которые можно предложить: ${services.join("; ")}.

Требования:
1. Начни с вежливого приветствия по имени компании.
2. Упомяни конкретную проблему (например, что у них нет сайта или бота).
3. Предложи конкретное решение из списка услуг.
4. Предложи короткий созвон или демо.
5. Объём: 3-5 предложений.
6. Без шаблонных фраз вроде «надеюсь, у вас всё хорошо».
7. В конце добавь подпись: «— Команда ЛидПоиск».

Верни ТОЛЬКО текст сообщения, без пояснений и markdown.`

      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        thinking: { type: "disabled" },
      })
      aiMessage = completion.choices[0]?.message?.content?.trim() || null

      const subjectCompletion = await zai.chat.completions.create({
        messages: [
          {
            role: "assistant",
            content:
              "Ты генерируешь очень короткие темы сообщений (3-6 слов) для холодного аутрича. Только текст, без кавычек.",
          },
          {
            role: "user",
            content: `Сгенерируй тему сообщения для компании «${lead.companyName}» (${nicheLabel}, ${lead.city}). Предлагаем: ${services[0]}.`,
          },
        ],
        thinking: { type: "disabled" },
      })
      aiSubject =
        subjectCompletion.choices[0]?.message?.content?.trim() ||
        `Предложение для ${lead.companyName}`
    } catch (sdkErr) {
      console.log("[generate-message] z-ai SDK недоступен, используем шаблонизатор:", (sdkErr as Error).message)
    }

    if (aiMessage) {
      return NextResponse.json({
        message: aiMessage,
        subject: aiSubject || `Предложение для ${lead.companyName}`,
        services,
        source: "ai",
      })
    }

    // Fallback: умный шаблонизатор
    const { message, subject } = buildTemplateMessage(lead, {
      nicheLabel,
      countryLabel,
      problemsText,
      services,
    })

    return NextResponse.json({
      message,
      subject,
      services,
      source: "template",
    })
  } catch (e) {
    console.error("[generate-message] error", e)
    return NextResponse.json(
      { error: "Ошибка генерации сообщения" },
      { status: 500 }
    )
  }
}

// ============================================================
// Локальный шаблонизатор (без LLM) — всегда работает
// ============================================================

function buildTemplateMessage(
  lead: {
    companyName: string
    niche: string
    country: string
    city: string
    problems: string[]
    rating: number
    reviewsCount: number
    website: string | null
  },
  ctx: {
    nicheLabel: string
    countryLabel: string
    problemsText: string
    services: string[]
  }
): { message: string; subject: string } {
  const { companyName, city, problems } = lead
  const { nicheLabel, services } = ctx

  // Главная проблема для упоминания
  let mainProblem = "заметили, что ваша онлайн-упаковка не доведена до конца"
  if (problems.includes("no_website")) {
    mainProblem = "не нашли у вас сайт — клиенты не могут вас найти в поиске"
  } else if (problems.includes("no_telegram")) {
    mainProblem = "не нашли Telegram-бота — клиенты не могут быстро записаться"
  } else if (problems.includes("no_whatsapp")) {
    mainProblem = "не нашли WhatsApp-канал для приёма заявок"
  } else if (problems.includes("bad_maps_card")) {
    mainProblem = "карточка в картах оформлена слабо — теряете часть заявок"
  } else if (problems.includes("few_reviews")) {
    mainProblem = "мало отзывов в картах — это снижает доверие клиентов"
  } else if (problems.includes("low_rating")) {
    mainProblem = "рейтинг в картах ниже 4.0 — клиенты уходят к конкурентам"
  }

  // Предлагаем топ-1 услугу
  const topService = services[0]

  const message = `Здравствуйте, «${companyName}»! Меня зовут Антон, веб-агентство «ЛидПоиск». Изучил вашу компанию в нише «${nicheLabel}» (${city}) — ${mainProblem}.

Предлагаем решение: ${topService}. Сделаем под ключ, средний чек от 50 000 ₽, запуск за 2 недели. У вас будет готовый инструмент для приёма заявок 24/7.

Удобно созвониться на 10 минут в эту среду или четверг, покажу кейсы похожих компаний из СНГ?

— Команда ЛидПоиск`

  const subject = `Предложение: ${topService.split(" ")[0]} для «${companyName}»`

  return { message, subject }
}
