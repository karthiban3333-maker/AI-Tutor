import Bytez from "bytez.js"

const key = "434a14fd3905d93d0fe2609995fd7498"
const sdk = new Bytez(key)

const candidateModels = [
  "meta-llama/Meta-Llama-3-8B-Instruct",
  "meta-llama/Llama-3-8b-instruct",
  "meta-llama/Llama-3-8b-chat",
  "Qwen/Qwen2.5-7B-Instruct",
  "mistralai/Mistral-7B-Instruct-v0.3",
  "google/gemma-2-9b-it",
  "google/gemma-7b-it",
  "microsoft/Phi-3-mini-4k-instruct"
]

for (const modelId of candidateModels) {
  console.log(`Testing model: ${modelId}...`)
  try {
    const model = sdk.model(modelId)
    const { error, output } = await model.run([
      { role: "user", content: "Hello, reply with one word: 'Success'" }
    ])
    if (error) {
      console.log(`  Error:`, error.substring ? error.substring(0, 150) : error)
    } else {
      console.log(`  Success! Output:`, output)
      break // stop at first success!
    }
  } catch (e) {
    console.log(`  Exception:`, e.message)
  }
}
