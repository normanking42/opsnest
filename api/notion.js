export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const token = process.env.NOTION_TOKEN
  if (!token) return res.status(500).json({ error: 'NOTION_TOKEN not set' })

  const { endpoint } = req.query
  if (!endpoint) return res.status(400).json({ error: 'Missing endpoint param' })

  try {
    const notionRes = await fetch(`https://api.notion.com/v1/${endpoint}`, {
      method: req.method === 'GET' ? 'GET' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body || {}) : undefined,
    })

    const data = await notionRes.json()
    return res.status(notionRes.status).json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
