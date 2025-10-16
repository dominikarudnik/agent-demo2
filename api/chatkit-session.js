import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY, // env var ONLY
    });

    const session = await openai.chatkits.sessions.create({
      workflow_id: process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_ID,
    });

    res.status(200).json({ client_secret: session.client_secret });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create ChatKit session" });
  }
}
