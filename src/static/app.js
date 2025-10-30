document.addEventListener("DOMContentLoaded", () => {
  const activitiesListEl = document.getElementById("activities-list");
  const activityTemplate = document.getElementById("activity-template");
  const signupForm = document.getElementById("signup-form");
  const activitySelect = document.getElementById("activity");
  const messageEl = document.getElementById("message");
  const emailInput = document.getElementById("email");

  function showMessage(text, type = "info") {
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.classList.remove("hidden");
    setTimeout(() => messageEl.classList.add("hidden"), 5000);
  }

  function escapeName(name) {
    return encodeURIComponent(name);
  }

  function renderActivities(data) {
    activitiesListEl.innerHTML = "";
    activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

    Object.keys(data).forEach((name) => {
      const activity = data[name];

      // populate select
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      activitySelect.appendChild(opt);

      // render card from template
      const node = activityTemplate.content.cloneNode(true);
      const card = node.querySelector(".activity-card");
      node.querySelector(".activity-name").textContent = name;
      node.querySelector(".activity-desc").textContent = activity.description;
      node.querySelector(".activity-schedule").textContent = `Schedule: ${activity.schedule}`;
      node.querySelector(".activity-capacity").textContent = `Capacity: ${activity.participants.length} / ${activity.max_participants}`;

      const ul = node.querySelector(".participants-list");
      if (Array.isArray(activity.participants) && activity.participants.length) {
        activity.participants.forEach((p) => {
          const li = document.createElement("li");
          // Container span for email
          const emailSpan = document.createElement("span");
          emailSpan.textContent = p;
          li.appendChild(emailSpan);

          // Delete icon button
          const delBtn = document.createElement("button");
          delBtn.className = "delete-participant-btn";
          delBtn.title = "Remover participante";
          delBtn.innerHTML = "&#128465;"; // Unicode lixeira
          delBtn.addEventListener("click", async (ev) => {
            ev.stopPropagation();
            if (!confirm(`Remover ${p} desta atividade?`)) return;
            try {
              const url = `/activities/${escapeName(name)}/unregister?email=${encodeURIComponent(p)}`;
              const res = await fetch(url, { method: "DELETE" });
              if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.detail || "Falha ao remover participante");
              }
              // Atualiza UI
              li.remove();
              // Atualiza capacidade
              const capEl = card.querySelector(".activity-capacity");
              if (capEl) {
                const currentText = capEl.textContent;
                const match = currentText.match(/Capacity:\s*(\d+)\s*\/\s*(\d+)/);
                if (match) {
                  const current = Math.max(0, parseInt(match[1], 10) - 1);
                  const max = match[2];
                  capEl.textContent = `Capacity: ${current} / ${max}`;
                }
              }
              // Se não houver mais participantes, mostra placeholder
              if (ul.children.length === 0) {
                const placeholder = document.createElement("li");
                placeholder.textContent = "No participants yet.";
                ul.appendChild(placeholder);
              }
            } catch (err) {
              alert(err.message || "Erro ao remover participante");
            }
          });
          li.appendChild(delBtn);
          ul.appendChild(li);
        });
      } else {
        const li = document.createElement("li");
        li.textContent = "No participants yet.";
        ul.appendChild(li);
      }

      const btn = node.querySelector(".signup-btn");
      btn.addEventListener("click", () => {
        // set the form select and focus email for quick signup
        activitySelect.value = name;
        emailInput.focus();
      });

      activitiesListEl.appendChild(node);
    });
  }

  async function loadActivities() {
    try {
      const res = await fetch("/activities");
      if (!res.ok) throw new Error("Failed to load activities");
      const data = await res.json();
      renderActivities(data);
    } catch (err) {
      activitiesListEl.innerHTML = "<p class='error'>Unable to load activities.</p>";
      console.error(err);
    }
  }

  signupForm.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const email = emailInput.value.trim();
    const activityName = activitySelect.value;

    if (!email || !activityName) {
      showMessage("Please provide both email and activity.", "error");
      return;
    }

    // optimistic UI: check if already in list to avoid duplicate attempt
    // find the corresponding participants list in the UI
    const cardNodes = [...document.querySelectorAll(".activity-card")];
    const cardForActivity = cardNodes.find((c) => c.querySelector(".activity-name").textContent === activityName);
    const participantsUl = cardForActivity ? cardForActivity.querySelector(".participants-list") : null;
    if (participantsUl) {
      const already = [...participantsUl.querySelectorAll("li")].some(li => li.textContent === email);
      if (already) {
        showMessage("Email already signed up for this activity.", "error");
        return;
      }
    }

    try {
      const url = `/activities/${escapeName(activityName)}/signup?email=${encodeURIComponent(email)}`;
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || "Signup failed");
      }
      const body = await res.json();
      showMessage(body.message || "Signed up successfully!", "success");

        // Atualiza toda a lista de atividades para refletir o novo participante
        await loadActivities();
      signupForm.reset();
    } catch (err) {
      showMessage(err.message || "Failed to sign up", "error");
      console.error(err);
    }
  });

  loadActivities();
});
