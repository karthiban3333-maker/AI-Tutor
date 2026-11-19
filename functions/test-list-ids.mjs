const key = "434a14fd3905d93d0fe2609995fd7498"

const modelIds = [
  "openai/gpt-4o-mini",
  "openai/gpt-4",
  "Qwen/Qwen2.5-7B-Instruct",
  "meta-llama/Llama-3-8b",
  "gpt2"
]

for (const modelId of modelIds) {
  const res = await fetch(`https://api.bytez.com/models/v2/list/models?modelId=${modelId}`, {
    headers: { "Authorization": `Key ${key}` }
  })
  const data = await res.json()
  console.log(`ModelId: ${modelId}, error: ${data.error}, output length: ${data.output ? data.output.length : "no output"}`)
  if (data.output && data.output.length > 0) {
    console.log(`  Details:`, data.output[0])
  }
}
