// Cloudflare Pages Function: POST /api/create-payment
// Sends order request to Telegram bot

export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const body = await request.json();
    const { plan, name, email, telegram, comment } = body;

    // Validate
    const PLANS = {
      daily:   { label: 'Daily — $4.20/day',   amount: '$4.20' },
      weekly:  { label: 'Weekly — $27/week',    amount: '$27' },
      monthly: { label: 'Monthly — $108/month', amount: '$108' },
      annual:  { label: 'Annual — $1080/year',  amount: '$1080' },
    };

    if (!plan || !PLANS[plan]) {
      return new Response(JSON.stringify({ error: 'Invalid plan' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (!name || !email) {
      return new Response(JSON.stringify({ error: 'Name and email are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Build Telegram message
    const lines = [
      `🆕 *New rental request (rentamac.pro)*`,
      ``,
      `📋 *Plan:* ${PLANS[plan].label}`,
      `💰 *Amount:* ${PLANS[plan].amount}`,
      `👤 *Name:* ${escapeMd(name)}`,
      `📧 *Email:* ${escapeMd(email)}`,
    ];

    if (telegram) lines.push(`💬 *Telegram:* ${escapeMd(telegram)}`);
    if (comment)  lines.push(`📝 *Comment:* ${escapeMd(comment)}`);

    lines.push(``, `⏰ ${new Date().toLocaleString('en-US', { timeZone: 'Europe/Moscow' })} MSK`);

    const text = lines.join('\n');

    // Send to Telegram
    const botToken = env.TELEGRAM_BOT_TOKEN;
    const chatId = env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.error('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set');
      return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Security: only send to owner chat
    const OWNER_CHAT_ID = '273203546';
    if (chatId !== OWNER_CHAT_ID) {
      console.error('CHAT_ID mismatch:', chatId);
      return new Response(JSON.stringify({ error: 'Configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const tgResp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    });

    if (!tgResp.ok) {
      const err = await tgResp.text();
      console.error('Telegram error:', err);
      return new Response(JSON.stringify({ error: 'Failed to send' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      message: 'Request submitted! We will contact you within 15 minutes.',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}

// Escape Markdown special characters
function escapeMd(text) {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
