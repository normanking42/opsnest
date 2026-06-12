export default async function handler(req, res) {
  const token = process.env.NOTION_TOKEN
  const { endpoint } = req.query

  const notionRes = await fetch(`https://api.notion.com/v1/${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })

  const data = await notionRes.json()
  return res.status(200).json({ status: notionRes.status, data })
}
