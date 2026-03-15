// Netlify serverless function to fetch Notion data
// Keeps API key server-side

const NOTION_KEY = process.env.NOTION_KEY;
const PAGE_IDS = {
  rituals: 'b8acbf8a-7c68-417a-9d83-23feb66b9056',
  adventures: 'a85574de-9149-40c3-a4ea-22a7b3999080',
  checkins: 'b8c58126-0b2d-45b8-ab63-5e773ee9fb6f',
  desires: '64a001a9-7014-40c2-b8ce-717c4a2106bd',
  boundaries: 'fd5f7b84-1a19-4e24-bab5-361479f7485b',
};

async function fetchBlocks(pageId) {
  const res = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`, {
    headers: {
      'Authorization': `Bearer ${NOTION_KEY}`,
      'Notion-Version': '2022-06-28',
    },
  });
  return res.json();
}

function extractText(block) {
  const type = block.type;
  const content = block[type];
  if (!content) return '';
  if (content.rich_text) {
    return content.rich_text.map(t => t.plain_text).join('');
  }
  if (content.title) {
    return content.title.map(t => t.plain_text).join('');
  }
  return '';
}

exports.handler = async (event) => {
  const section = event.queryStringParameters?.section || 'all';

  try {
    const data = {};

    if (section === 'all' || section === 'rituals') {
      const blocks = await fetchBlocks(PAGE_IDS.rituals);
      data.rituals = blocks.results.map(b => ({
        type: b.type,
        text: extractText(b),
        checked: b.type === 'to_do' ? b.to_do?.checked : undefined,
      })).filter(b => b.text);
    }

    if (section === 'all' || section === 'adventures') {
      const blocks = await fetchBlocks(PAGE_IDS.adventures);
      data.adventures = blocks.results.map(b => ({
        type: b.type,
        text: extractText(b),
      })).filter(b => b.text);
    }

    if (section === 'all' || section === 'checkins') {
      const blocks = await fetchBlocks(PAGE_IDS.checkins);
      data.checkins = blocks.results.map(b => ({
        type: b.type,
        text: extractText(b),
      })).filter(b => b.text);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
