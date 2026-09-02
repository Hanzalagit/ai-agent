const API_KEY = "nvai-2337c37e7f018f514cc49979f25c87f44e994120d97ffc6c";
const BASE = "https://aiapi-pro.com/v1";

async function test() {
  console.log("1. Submitting video job...");
  
  const jobRes = await fetch(`${BASE}/video/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "cogvideox-flash",
      prompt: "a cute cat playing with yarn",
    }),
  });

  const job = await jobRes.json();
  console.log("Job:", JSON.stringify(job, null, 2));

  console.log("\n2. Polling...");
  
  for (let i = 0; i < 5; i++) {
    await new Promise(r => setTimeout(r, 5000));
    
    const pollRes = await fetch(`${BASE}/video/generations/${job.id}?model=cogvideox-flash`, {
      headers: { "Authorization": `Bearer ${API_KEY}` },
    });

    const data = await pollRes.json();
    console.log(`\nPoll ${i+1}:`, JSON.stringify(data, null, 2).substring(0, 1000));
  }
}

test().catch(e => console.error("Error:", e.message));
