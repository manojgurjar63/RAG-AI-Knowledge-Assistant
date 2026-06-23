export function createEmbedding(text) { 
    const vector = new Array(384).fill(0); 
    const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/); 
    for (const word of words) { 
        let hash = 0; for (let i = 0; i < word.length; i++) { 
        hash += word.charCodeAt(i); 
        } 
        const bucket = hash % 384; vector[bucket]++; 
    } 
    return vector; 
}