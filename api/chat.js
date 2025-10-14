export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { message, threadId } = req.body || {};
    if (!message) return res.status(400).json({ error: "Missing message" });

    const apiKey = process.env.OPENAI_API_KEY;
    const assistantId = process.env.ASSISTANT_ID;
    if (!apiKey || !assistantId) return res.status(500).json({ error: "Missing API keys" });

    // 1️⃣ Utwórz thread, jeśli nie istnieje
    let tId = threadId;
    if (!tId) {
      const t = await fetch("https://api.openai.com/v1/threads", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }
      }).then(r => r.json());
      tId = t.id;
    }

    // 2️⃣ Dodaj wiadomość
    await fetch(`https://api.openai.com/v1/threads/${tId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ role: "user", content: message })
    });

    // 3️⃣ Uruchom run
    let run = await fetch(`https://api.openai.com/v1/threads/${tId}/runs`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ assistant_id: assistantId })
    }).then(r => r.json());

    // 4️⃣ Polling (czekamy na wynik)
    let status = run.status;
    const start = Date.now();
    while (status !== "completed" && status !== "failed" && Date.now() - start < 20000) {
      await new Promise(r => setTimeout(r, 1000));
      run = await fetch(`https://api.openai.com/v1/threads/${tId}/runs/${run.id}`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      }).then(r => r.json());
      status = run.status;
    }

    if (status !== "completed")
      return res.status(500).json({ error: `Run status: ${status}`, threadId: tId });

    // 5️⃣ Pobierz ostatnią odpowiedź
    const msgs = await fetch(`https://api.openai.com/v1/threads/${tId}/messages`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    }).then(r => r.json());

    const lastAssistant = msgs.data.find(m => m.role === "assistant");
    const reply = lastAssistant?.content?.[0]?.text?.value || "(brak odpowiedzi)";

    return res.status(200).json({ reply, threadId: tId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
