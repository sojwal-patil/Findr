module.exports = function handler(req, res) {
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) {}
  }
  body = body || {};

  const rows = body.rows || [];
  const lines = [
    ["Product Name", "Image URL", "Match Score (%)", "Image Title"].join(',')
  ];

  for (const item of rows) {
    const pName = `"${String(item.product_name || '').replace(/"/g, '""')}"`;
    const imgUrl = `"${String(item.image_url || '').replace(/"/g, '""')}"`;
    const score = item.match_score || '';
    const title = `"${String(item.best_title || '').replace(/"/g, '""')}"`;
    lines.push([pName, imgUrl, score, title].join(','));
  }

  const csvData = '\uFEFF' + lines.join('\n'); // Add UTF-8 BOM

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=products_with_images.csv');
  return res.status(200).send(csvData);
};
