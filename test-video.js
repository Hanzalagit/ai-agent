// Test free video APIs
const tests = [
  { 
    name: "LTX via Pollinations (no key)", 
    url: "https://image.pollinations.ai/prompt/a%20cat%20running?model=ltx-2&width=480&height=270" 
  },
  { 
    name: "Stable Video via Replicate (needs key)", 
    url: "https://replicate.com/api/models/stability-ai/stable-video-diffusion" 
  },
];

for (const test of tests) {
  console.log(`\nTesting: ${test.name}`);
  try {
    const res = await fetch(test.url, { signal: AbortSignal.timeout(10000) });
    console.log(`Status: ${res.status}`);
    console.log(`Content-Type: ${res.headers.get("content-type")}`);
  } catch (e) {
    console.log(`Error: ${e.message}`);
  }
}
