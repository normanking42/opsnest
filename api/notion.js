export default async function handler(req, res) {
  const token = process.env.NOTION_TOKEN

  return res.status(200).json({
    tokenExists: !!token,
    tokenPrefix: token ? token.slice(0, 10) : 'MISSING',
    endpoint: req.query.endpoint,
    method: req.method,
  })
}
