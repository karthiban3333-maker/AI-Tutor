const key = "434a14fd3905d93d0fe2609995fd7498"

const res = await fetch("https://api.bytez.com/models/v2/openai/gpt-4o-mini", {
  method: "POST",
  headers: {
    "Authorization": key,
    "provider-key": "sk-dummy123456789012345678901234567890",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    messages: [
      { role: "user", content: "Hello" }
    ]
  })
})
const data = await res.json()
console.log(data)
