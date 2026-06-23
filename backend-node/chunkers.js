function chunkText(text, chunkSize = 500, overlap = 100) {
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    chunks.push(words.slice(i, i + chunkSize).join(' '));
    if (i + chunkSize >= words.length) break;
  }
  return chunks;
}

module.exports = { chunkText };
