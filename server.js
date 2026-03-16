const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const NOTION_KEY = process.env.NOTION_KEY;

const PAGE_IDS = {
  rituals: 'b8acbf8a-7c68-417a-9d83-23feb66b9056',
  adventures: 'a85574de-9149-40c3-a4ea-22a7b3999080',
  checkins: 'b8c58126-0b2d-45b8-ab63-5e773ee9fb6f',
};

async function fetchBlocks(pageId) {
  const res = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`, {
    headers: { 'Authorization': `Bearer ${NOTION_KEY}`, 'Notion-Version': '2022-06-28' },
  });
  return res.json();
}

function extractText(block) {
  try {
    const content = block[block.type];
    if (!content) return '';
    // rich_text: array of text objects (standard Notion blocks)
    if (Array.isArray(content.rich_text)) {
      return content.rich_text.map(t => t.plain_text).join('');
    }
    // title: can be array (database title) or string (child_page)
    if (content.title !== undefined) {
      if (Array.isArray(content.title)) {
        return content.title.map(t => t.plain_text).join('');
      }
      if (typeof content.title === 'string') {
        return content.title;
      }
    }
    return '';
  } catch {
    return '';
  }
}

async function handleAPI(res) {
  try {
    const data = {};
    for (const [key, id] of Object.entries(PAGE_IDS)) {
      const blocks = await fetchBlocks(id);
      data[key] = blocks.results.map(b => ({
        type: b.type,
        text: extractText(b),
        checked: b.type === 'to_do' ? b.to_do?.checked : undefined,
      })).filter(b => b.text);
    }
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(data));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  if (req.url === '/api/notion') {
    return handleAPI(res);
  }

  let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => console.log(`Marayoo dashboard running on :${PORT}`));
