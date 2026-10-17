export async function sendDiscord(webhookUrl, body) {
  const url = new URL(webhookUrl);
  if (url.protocol !== 'https:' || !(url.hostname === 'discord.com' || url.hostname === 'discordapp.com') ||
      !url.pathname.startsWith('/api/webhooks/')) throw new Error('Invalid Discord webhook host/path');
  const chunks=[];
  // Discord webhook max content ~2000 chars, split conservatively without spilling to logs.
  let buffer='';
  for (const line of body.split('\n')) {
    if (buffer.length+line.length+1 > 1750) { chunks.push(buffer); buffer=''; }
    buffer += (buffer ? '\n' : '') + line.slice(0,1700);
  }
  if (buffer) chunks.push(buffer);
  for (const content of chunks) {
    const response = await fetch(url, {method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({content,allowed_mentions:{parse:[]}}),signal:AbortSignal.timeout(10000)});
    if (!response.ok) throw new Error(`Discord HTTP ${response.status}`);
  }
}
