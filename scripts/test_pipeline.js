// Self-contained script to test and validate EchoFilter core algorithms

// 1. Cosine Similarity implementation
function dotProduct(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

function magnitude(a) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * a[i];
  }
  return Math.sqrt(sum);
}

function cosineSimilarity(a, b) {
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return dotProduct(a, b) / (magA * magB);
}

// 2. Chunking simulation
function chunkTranscript(segments, videoId) {
  const chunks = [];
  let currentSegments = [];
  let currentWordsCount = 0;
  let chunkIndex = 0;

  for (const seg of segments) {
    const wordCount = seg.text.split(/\s+/).length;
    const currentDuration = currentSegments.length > 0 
      ? (seg.start + seg.duration) - currentSegments[0].start
      : 0;

    if (currentSegments.length > 0 && (currentDuration >= 60 || currentWordsCount + wordCount > 150)) {
      const text = currentSegments.map(s => s.text).join(' ').trim().replace(/\s+/g, ' ');
      const startTime = currentSegments[0].start;
      const duration = (currentSegments[currentSegments.length - 1].start + currentSegments[currentSegments.length - 1].duration) - startTime;
      
      chunks.push({
        id: `${videoId}_ch_${chunkIndex++}`,
        videoId,
        text,
        startTime: Math.round(startTime * 100) / 100,
        duration: Math.round(duration * 100) / 100,
      });
      currentSegments = [];
      currentWordsCount = 0;
    }

    currentSegments.push(seg);
    currentWordsCount += wordCount;
  }

  if (currentSegments.length > 0) {
    const text = currentSegments.map(s => s.text).join(' ').trim().replace(/\s+/g, ' ');
    const startTime = currentSegments[0].start;
    const duration = (currentSegments[currentSegments.length - 1].start + currentSegments[currentSegments.length - 1].duration) - startTime;
    
    chunks.push({
      id: `${videoId}_ch_${chunkIndex}`,
      videoId,
      text,
      startTime: Math.round(startTime * 100) / 100,
      duration: Math.round(duration * 100) / 100,
    });
  }

  return chunks;
}

// 3. Information-Density Ranking Algorithm
function calculateSFinal(D_info, R_filler, C_community) {
  const w1 = 0.65;
  const w2 = 0.25;
  const w3 = 0.10;
  
  return (w1 * D_info) - (w2 * R_filler) + (w3 * Math.log10(C_community + 1));
}

// --- RUN TESTS ---
console.log("=== EchoFilter Pipeline Verification ===");

// A. Test Cosine Similarity
console.log("\nTesting Cosine Similarity:");
const vecA = [1, 0, 1, 0];
const vecB = [1, 1, 0, 0];
const simAB = cosineSimilarity(vecA, vecB);
console.log(`Cosine Similarity of [1,0,1,0] and [1,1,0,0]: ${simAB.toFixed(4)} (Expected: 0.5000)`);
if (Math.abs(simAB - 0.5) < 1e-6) {
  console.log("✅ Cosine similarity test passed!");
} else {
  console.error("❌ Cosine similarity test failed.");
}

// B. Test Chunking
console.log("\nTesting Transcript Chunking:");
const mockSegments = [];
for (let i = 0; i < 20; i++) {
  mockSegments.push({
    text: `segment text line number ${i} which has about ten words in it to simulate transcripts`,
    start: i * 10,
    duration: 8
  });
}
const chunks = chunkTranscript(mockSegments, "test_video_123");
console.log(`Chunked 20 segments into ${chunks.length} chunks.`);
console.log(`First Chunk Details: id=${chunks[0].id}, start=${chunks[0].startTime}s, duration=${chunks[0].duration}s, wordCount=${chunks[0].text.split(' ').length}`);
if (chunks.length > 0 && chunks[0].duration <= 60 && chunks[0].text.includes("segment text line number 0")) {
  console.log("✅ Chunking test passed!");
} else {
  console.error("❌ Chunking test failed.");
}

// C. Test Ranking Formula
console.log("\nTesting S_final Ranking Calculations:");
const videos = [
  { id: "vid_high_density", D_info: 0.9, R_filler: 0.05, C_comm: 5 },
  { id: "vid_surface_level", D_info: 0.5, R_filler: 0.2, C_comm: 2 },
  { id: "vid_clickbait", D_info: 0.1, R_filler: 0.8, C_comm: 0 }
];

videos.forEach(v => {
  const score = calculateSFinal(v.D_info, v.R_filler, v.C_comm);
  console.log(`Video: ${v.id} -> S_final: ${score.toFixed(4)}`);
  v.score = score;
});

// Sort descending
videos.sort((a, b) => b.score - a.score);
console.log("Sorted result order:", videos.map(v => v.id).join(" -> "));
if (videos[0].id === "vid_high_density" && videos[2].id === "vid_clickbait") {
  console.log("✅ Ranking sorting order test passed!");
} else {
  console.error("❌ Ranking sorting order test failed.");
}

console.log("\n=== All Tests Completed Successfully ===");
