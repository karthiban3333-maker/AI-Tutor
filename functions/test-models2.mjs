import Bytez from "bytez.js"

const key = "434a14fd3905d93d0fe2609995fd7498"
const sdk = new Bytez(key)

const candidateModels = [
  "meta-llama/Llama-3-70b",
  "0-hero/Matter-0.1-Slim-7B-C",
  "Qwen/Qwen2-7B-Instruct",
  "meta-llama/Llama-3.2-3B-Instruct"
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
      break
    }
  } catch (e) {
    console.log(`  Exception:`, e.message)
  }
}
