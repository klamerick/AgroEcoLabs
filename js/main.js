function showLoginNotification(message, type) {
  const notification = document.createElement("div");
  notification.className = `login-notification ${type}`;
  notification.textContent = message;

  const loginScreen = document.getElementById("login-screen");
  loginScreen.appendChild(notification);

  setTimeout(() => {
    notification.classList.add("fade-out");
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

function handleRegister() {
  const user = document.getElementById("register-username").value.trim();
  const pass = document.getElementById("register-password").value.trim();

  if (!user || !pass) {
    showLoginNotification("Preencha todos os campos.", "error");
    return;
  }

  const users = JSON.parse(localStorage.getItem("users") || "{}");

  if (users[user]) {
    showLoginNotification("Usuário já existe.", "error");
    return;
  }

  users[user] = { password: pass };
  localStorage.setItem("users", JSON.stringify(users));
  showLoginNotification("Cadastro realizado com sucesso!", "success");
}

function handleLogin() {
  const user = document.getElementById("login-username").value.trim();
  const pass = document.getElementById("login-password").value.trim();

  if (!user || !pass) {
    showLoginNotification("Digite o usuário e a senha.", "error");
    return false;
  }

  const users = JSON.parse(localStorage.getItem("users") || "{}");

  if (!users[user] || users[user].password !== pass) {
    showLoginNotification("Usuário ou senha incorretos.", "error");
    return false;
  }

  localStorage.setItem("lastUser", user);
  return true;
}

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("login-button")) {
    document.getElementById("login-button").addEventListener("click", () => {
      if (handleLogin()) {
        showSimulator();
      }
    });
    document.getElementById("register-button").addEventListener("click", handleRegister);
  }
});