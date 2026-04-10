document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const searchInput = document.getElementById("search");
  const availabilityFilter = document.getElementById("availability-filter");
  const sortBySelect = document.getElementById("sort-by");

  let activitiesData = {};

  function normalizeText(text) {
    return String(text).toLowerCase();
  }

  function getScheduleDay(schedule) {
    const days = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];
    const lower = normalizeText(schedule);
    const found = days.findIndex((day) => lower.includes(day));
    return found === -1 ? days.length : found;
  }

  function getFilteredActivities() {
    const searchText = normalizeText(searchInput.value.trim());
    const availability = availabilityFilter.value;
    const sortBy = sortBySelect.value;

    return Object.entries(activitiesData)
      .map(([name, details]) => ({
        name,
        description: details.description,
        schedule: details.schedule,
        max_participants: details.max_participants,
        participants: details.participants,
        spotsLeft: details.max_participants - details.participants.length,
      }))
      .filter((activity) => {
        const matchesSearch =
          searchText === "" ||
          normalizeText(activity.name).includes(searchText) ||
          normalizeText(activity.description).includes(searchText);

        if (!matchesSearch) {
          return false;
        }

        if (availability === "open") {
          return activity.spotsLeft > 0;
        }

        if (availability === "full") {
          return activity.spotsLeft <= 0;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name-asc") {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === "name-desc") {
          return b.name.localeCompare(a.name);
        }
        if (sortBy === "day") {
          const dayComparison = getScheduleDay(a.schedule) - getScheduleDay(b.schedule);
          return dayComparison !== 0 ? dayComparison : a.name.localeCompare(b.name);
        }
        if (sortBy === "spots") {
          const spotComparison = b.spotsLeft - a.spotsLeft;
          return spotComparison !== 0 ? spotComparison : a.name.localeCompare(b.name);
        }
        return a.name.localeCompare(b.name);
      });
  }

  function updateActivityOptions(filteredActivities) {
    activitySelect.innerHTML =
      '<option value="">-- Select an activity --</option>';

    filteredActivities.forEach((activity) => {
      const option = document.createElement("option");
      option.value = activity.name;
      option.textContent = `${activity.name} (${activity.spotsLeft} spots left)`;
      if (activity.spotsLeft <= 0) {
        option.disabled = true;
      }
      activitySelect.appendChild(option);
    });
  }

  function renderActivities() {
    const filteredActivities = getFilteredActivities();
    activitiesList.innerHTML = "";

    if (filteredActivities.length === 0) {
      activitiesList.innerHTML =
        "<p>No activities match your search and filters.</p>";
      activitySelect.innerHTML =
        '<option value="">-- No activities available --</option>';
      return;
    }

    filteredActivities.forEach((activity) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";

      const availabilityText =
        activity.spotsLeft > 0 ? `${activity.spotsLeft} spots left` : "Full";

      const participantsHTML =
        activity.participants.length > 0
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${activity.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${activity.name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
          : `<p><em>No participants yet</em></p>`;

      activityCard.innerHTML = `
        <h4>${activity.name}</h4>
        <p>${activity.description}</p>
        <p><strong>Schedule:</strong> ${activity.schedule}</p>
        <p><strong>Availability:</strong> ${availabilityText}</p>
        <div class="participants-container">
          ${participantsHTML}
        </div>
      `;

      activitiesList.appendChild(activityCard);
    });

    updateActivityOptions(filteredActivities);

    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      activitiesData = await response.json();
      renderActivities();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      console.error("Error unregistering:", error);
    }

    messageDiv.classList.remove("hidden");
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      console.error("Error signing up:", error);
    }

    messageDiv.classList.remove("hidden");
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  });

  searchInput.addEventListener("input", renderActivities);
  availabilityFilter.addEventListener("change", renderActivities);
  sortBySelect.addEventListener("change", renderActivities);

  fetchActivities();
});
