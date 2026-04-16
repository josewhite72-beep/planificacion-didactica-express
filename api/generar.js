// api/generar.js — Vercel Function
// La API key de Anthropic vive aquí, en el servidor. Nunca llega al navegador.

export default async function handler(req, res) {
  // Solo aceptar POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Leer API key desde variable de entorno (la configuras en Vercel dashboard)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key no configurada en el servidor' });
  }

  try {
    const { prompt, maxTokens = 1800 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Falta el prompt' });
    }

    // Llamar a Anthropic desde el servidor
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: `Error Anthropic: ${err}` });
    }

    const data = await response.json();
    const texto = data.content?.map(b => b.text || '').join('') || '';

    return res.status(200).json({ texto });

  } catch (error) {
    console.error('Error en /api/generar:', error);
    return res.status(500).json({ error: error.message });
  }
}
