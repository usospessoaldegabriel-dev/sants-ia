const chat = document.querySelector("#chat");
const welcome = document.querySelector("#welcome");
const form = document.querySelector("#form");
const input = document.querySelector("#message");
const fileInput = document.querySelector("#images");
const previews = document.querySelector("#previews");
const send = document.querySelector("#send");
let messages = [];
let selectedFiles = [];

function addMessage(role, content, images = []) {
  welcome?.remove();
  const el = document.createElement("div");
  el.className = `message ${role}`;
  el.textContent = content;
  for (const url of images) {
    const img = document.createElement("img");
    img.src = url; el.append(img);
  }
  chat.append(el); chat.scrollTop = chat.scrollHeight;
}
function updatePreviews() {
  previews.innerHTML = "";
  selectedFiles.forEach(file => {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file); img.title = file.name;
    previews.append(img);
  });
}
fileInput.addEventListener("change", () => {
  selectedFiles = [...selectedFiles, ...fileInput.files].slice(0, 8);
  updatePreviews(); fileInput.value = "";
});
document.querySelectorAll("[data-prompt]").forEach(btn => btn.addEventListener("click", () => {
  input.value = btn.dataset.prompt; input.focus();
}));
document.querySelector("#newChat").addEventListener("click", () => {
  messages = []; chat.innerHTML = ""; chat.append(welcome.cloneNode(true));
  document.querySelector("#history").insertAdjacentHTML("afterbegin", `<button>${new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})} · Nova conversa</button>`);
});
document.querySelector("#clear").addEventListener("click", () => {
  messages = []; chat.innerHTML = ""; chat.append(welcome.cloneNode(true));
});
form.addEventListener("submit", async e => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text && selectedFiles.length === 0) return;
  const files = [...selectedFiles].slice(0, 4);
  const imageUrls = await Promise.all(files.map(file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  })));
  addMessage("user", text || "Analise as imagens que enviei.", imageUrls);
  messages.push({ role: "user", content: text || "Analise as imagens que enviei.", images: imageUrls });
  input.value = ""; selectedFiles = []; updatePreviews(); send.disabled = true;
  const wait = document.createElement("div"); wait.className = "message assistant"; wait.textContent = "SANTS IA está pensando…"; chat.append(wait);
  try {
    const response = await fetch("/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Erro na resposta.");
    wait.textContent = data.reply;
    messages.push({ role: "assistant", content: data.reply });
    const history = document.querySelector("#history");
    if (!history.children.length) history.insertAdjacentHTML("afterbegin", `<button>${text.slice(0,32) || "Conversa com imagens"}</button>`);
  } catch (err) { wait.textContent = `⚠️ ${err.message}`; }
  finally { send.disabled = false; chat.scrollTop = chat.scrollHeight; }
});
input.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
});
