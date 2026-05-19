export default async function handler(req, res) {
  const { uid } = req.query;

  if (!uid) {
    return res.status(400).json({ error: "UID가 필요합니다." });
  }

  const enkaUrl = `https://enka.network/api/hsr/uid/${uid}/`;

  try {
    const response = await fetch(enkaUrl, {
      headers: {
        'User-Agent': 'test project (https://github.com/miisiru/miisiru.github.io)'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Enka API 응답 실패" });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}