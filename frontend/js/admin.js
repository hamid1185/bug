class AdminManager {
  constructor() {
    this.init()
  }

  async init() {
    await this.loadUsers()
    await this.loadProjects()
    await this.loadSettings()
    this.setupEventListeners()
  }

  async loadUsers() {
    try {
      const response = await fetch("../backend/api/admin/users.php")
      const data = await response.json()

      if (data.success) {
        this.renderUsersTable(data.users)
      }
    } catch (error) {
      console.error("Error loading users:", error)
      window.showNotification("Error loading users", "error")
    }
  }

  async loadProjects() {
    try {
      const response = await fetch("../backend/api/admin/projects.php")
      const data = await response.json()

      if (data.success) {
        this.renderProjectsTable(data.projects)
      }
    } catch (error) {
      console.error("Error loading projects:", error)
      window.showNotification("Error loading projects", "error")
    }
  }

  async loadSettings() {
    try {
      const response = await fetch("../backend/api/admin/settings.php")
      const data = await response.json()

      if (data.success) {
        this.populateSettings(data.settings)
      }
    } catch (error) {
      console.error("Error loading settings:", error)
    }
  }

  renderUsersTable(users) {
    const tbody = document.getElementById("usersTable")
    tbody.innerHTML = users
      .map(
        (user) => `
            <tr>
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td><span class="role-badge ${user.role}">${user.role}</span></td>
                <td><span class="status-badge ${user.status}">${user.status}</span></td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="action-btn" onclick="editUser(${user.id})">Edit</button>
                    <button class="action-btn danger" onclick="deleteUser(${user.id})">Delete</button>
                </td>
            </tr>
        `,
      )
      .join("")
  }

  renderProjectsTable(projects) {
    const tbody = document.getElementById("projectsTable")
    tbody.innerHTML = projects
      .map(
        (project) => `
            <tr>
                <td>${project.id}</td>
                <td>${project.name}</td>
                <td>${project.description || "No description"}</td>
                <td><span class="status-badge ${project.status}">${project.status}</span></td>
                <td>${project.bug_count || 0}</td>
                <td>${new Date(project.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="action-btn" onclick="editProject(${project.id})">Edit</button>
                    <button class="action-btn danger" onclick="deleteProject(${project.id})">Delete</button>
                </td>
            </tr>
        `,
      )
      .join("")
  }

  populateSettings(settings) {
    document.getElementById("emailNotifications").checked = settings.email_notifications
    document.getElementById("autoAssign").checked = settings.auto_assign
    document.getElementById("publicRegistration").checked = settings.public_registration
    document.getElementById("backupFrequency").value = settings.backup_frequency
  }

  setupEventListeners() {
    // Add User Form
    document.getElementById("addUserForm").addEventListener("submit", async (e) => {
      e.preventDefault()
      await this.addUser()
    })

    // Add Project Form
    document.getElementById("addProjectForm").addEventListener("submit", async (e) => {
      e.preventDefault()
      await this.addProject()
    })
  }

  async addUser() {
    try {
      const formData = {
        username: document.getElementById("newUsername").value,
        email: document.getElementById("newEmail").value,
        password: document.getElementById("newPassword").value,
        role: document.getElementById("newRole").value,
      }

      const response = await fetch("../backend/api/admin/add_user.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      if (data.success) {
        window.showNotification("User added successfully", "success")
        closeModal("addUserModal")
        document.getElementById("addUserForm").reset()
        await this.loadUsers()
      } else {
        window.showNotification(data.message || "Error adding user", "error")
      }
    } catch (error) {
      console.error("Error adding user:", error)
      window.showNotification("Error adding user", "error")
    }
  }

  async addProject() {
    try {
      const formData = {
        name: document.getElementById("projectName").value,
        description: document.getElementById("projectDescription").value,
        status: document.getElementById("projectStatus").value,
      }

      const response = await fetch("../backend/api/admin/add_project.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      if (data.success) {
        window.showNotification("Project added successfully", "success")
        closeModal("addProjectModal")
        document.getElementById("addProjectForm").reset()
        await this.loadProjects()
      } else {
        window.showNotification(data.message || "Error adding project", "error")
      }
    } catch (error) {
      console.error("Error adding project:", error)
      window.showNotification("Error adding project", "error")
    }
  }
}

// Global functions
function showTab(tabName) {
  // Hide all tabs
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.classList.remove("active")
  })
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active")
  })

  // Show selected tab
  document.getElementById(tabName + "Tab").classList.add("active")
  event.target.classList.add("active")
}

function showAddUserModal() {
  document.getElementById("addUserModal").style.display = "block"
}

function showAddProjectModal() {
  document.getElementById("addProjectModal").style.display = "block"
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = "none"
}

async function editUser(userId) {
  // Implementation for editing user
  window.showNotification("Edit user functionality coming soon", "info")
}

async function deleteUser(userId) {
  if (confirm("Are you sure you want to delete this user?")) {
    try {
      const response = await fetch(`../backend/api/admin/delete_user.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: userId }),
      })

      const data = await response.json()
      if (data.success) {
        window.showNotification("User deleted successfully", "success")
        adminManager.loadUsers()
      } else {
        window.showNotification(data.message || "Error deleting user", "error")
      }
    } catch (error) {
      console.error("Error deleting user:", error)
      window.showNotification("Error deleting user", "error")
    }
  }
}

async function editProject(projectId) {
  // Implementation for editing project
  window.showNotification("Edit project functionality coming soon", "info")
}

async function deleteProject(projectId) {
  if (confirm("Are you sure you want to delete this project?")) {
    try {
      const response = await fetch(`../backend/api/admin/delete_project.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ project_id: projectId }),
      })

      const data = await response.json()
      if (data.success) {
        window.showNotification("Project deleted successfully", "success")
        adminManager.loadProjects()
      } else {
        window.showNotification(data.message || "Error deleting project", "error")
      }
    } catch (error) {
      console.error("Error deleting project:", error)
      window.showNotification("Error deleting project", "error")
    }
  }
}

async function saveSettings() {
  try {
    const settings = {
      email_notifications: document.getElementById("emailNotifications").checked,
      auto_assign: document.getElementById("autoAssign").checked,
      public_registration: document.getElementById("publicRegistration").checked,
      backup_frequency: document.getElementById("backupFrequency").value,
    }

    const response = await fetch("../backend/api/admin/save_settings.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(settings),
    })

    const data = await response.json()
    if (data.success) {
      window.showNotification("Settings saved successfully", "success")
    } else {
      window.showNotification(data.message || "Error saving settings", "error")
    }
  } catch (error) {
    console.error("Error saving settings:", error)
    window.showNotification("Error saving settings", "error")
  }
}

async function resetSettings() {
  if (confirm("Are you sure you want to reset all settings to default?")) {
    try {
      const response = await fetch("../backend/api/admin/reset_settings.php", {
        method: "POST",
      })

      const data = await response.json()
      if (data.success) {
        window.showNotification("Settings reset successfully", "success")
        adminManager.loadSettings()
      } else {
        window.showNotification(data.message || "Error resetting settings", "error")
      }
    } catch (error) {
      console.error("Error resetting settings:", error)
      window.showNotification("Error resetting settings", "error")
    }
  }
}

// Initialize admin manager when page loads
let adminManager
document.addEventListener("DOMContentLoaded", () => {
  adminManager = new AdminManager()
})

// Close modals when clicking outside
window.onclick = (event) => {
  const modals = document.querySelectorAll(".modal")
  modals.forEach((modal) => {
    if (event.target === modal) {
      modal.style.display = "none"
    }
  })
}
