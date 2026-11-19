const key = "434a14fd3905d93d0fe2609995fd7498"

const tasks = [
  'chat',
  'text-generation',
  'text2text-generation',
  'summarization',
  'question-answering'
]

for (const task of tasks) {
  const res = await fetch(`https://api.bytez.com/models/v2/list/models?task=${task}`, {
    headers: { "Authorization": key }
  })
  const data = await res.json()
  console.log(`Task: ${task}, error: ${data.error}, length: ${data.output ? data.output.length : "no output"}`)
  if (data.output && data.output.length > 0) {
    console.log(`  First 3 models for ${task}:`, data.output.slice(0, 3).map(m => m.modelId))
  }
}
