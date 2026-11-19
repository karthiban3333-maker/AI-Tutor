const key = "434a14fd3905d93d0fe2609995fd7498"

const res = await fetch("https://api.bytez.com/models/v2/list/models?task=text-generation", {
  headers: { "Authorization": `Key ${key}` }
})
const data = await res.json()
console.log("With task=text-generation and Key prefix:", data)
