class KanbanBoard {
  constructor() {
    this.bugs = []
    this.projects = []
    this.draggedElement = null
    this.init()
  }

  async init() {
    await this.loadProjects()
    await this.loadBugs()
    this.setupEventListeners()
    this.renderBoard()
  }

  async loadProjects() {
    try {
      const response = await fetch("../backend/api/projects.php")
      const data = await response.json()
      if (data.success) {
        this.projects = data.projects
        this.populateProjectFilter()
      }
    } catch (error) {
      console.error("Error loading projects:", error)
    }
  }

  async loadBugs() {
    try {
      const projectId = document.getElementById("projectFilter").value
      const url = projectId ? `../backend/api/bugs.php?project_id=${projectId}` : "../backend/api/bugs.php"

      const response = await fetch(url)
      const data = await response.json()
      if (data.success) {
        this.bugs = data.bugs
        this.renderBoard()
      }
    } catch (error) {
      console.error("Error loading bugs:", error)
      window.showNotification("Error loading bugs", "error")
    }
  }

  populateProjectFilter() {
    const select = document.getElementById("projectFilter")
    select.innerHTML = '<option value="">All Projects</option>'

    this.projects.forEach((project) => {
      const option = document.createElement("option")
      option.value = project.id
      option.textContent = project.name
      select.appendChild(option)
    })
  }

  renderBoard() {
    const columns = ["open", "in-progress", "testing", "closed"]

    columns.forEach((status) => {
      const column = document.getElementById(`${status.replace("-", "")}Column`)
      const count = document.getElementById(`${status.replace("-", "")}Count`)

      const statusBugs = this.bugs.filter((bug) => bug.status === status)
      count.textContent = statusBugs.length

      if (statusBugs.length === 0) {
        column.innerHTML = '<div class="empty-column">No bugs in this status</div>'
      } else {
        column.innerHTML = statusBugs.map((bug) => this.createBugCard(bug)).join("")
      }
    })

    this.setupDragAndDrop()
  }

  createBugCard(bug) {
    const priorityClass = bug.priority.toLowerCase()
    const assigneeInitial = bug.assigned_to ? bug.assigned_to.charAt(0).toUpperCase() : "?"
    const formattedDate = new Date(bug.created_at).toLocaleDateString()

    return `
            <div class="bug-card" draggable="true" data-bug-id="${bug.id}" onclick="openBugModal(${bug.id})">
                <div class="bug-card-header">
                    <span class="bug-id">#${bug.id}</span>
                    <span class="bug-priority ${priorityClass}">${bug.priority}</span>
                </div>
                <div class="bug-title">${bug.title}</div>
                <div class="bug-description">${bug.description}</div>
                <div class="bug-meta">
                    <div class="bug-assignee">
                        <div class="assignee-avatar">${assigneeInitial}</div>
                        <span>${bug.assigned_to || "Unassigned"}</span>
                    </div>
                    <div class="bug-date">${formattedDate}</div>
                </div>
            </div>
        `
  }

  setupDragAndDrop() {
    const cards = document.querySelectorAll(".bug-card")
    const columns = document.querySelectorAll(".column-content")

    cards.forEach((card) => {
      card.addEventListener("dragstart", (e) => {
        this.draggedElement = card
        card.classList.add("dragging")
        e.dataTransfer.effectAllowed = "move"
      })

      card.addEventListener("dragend", () => {
        card.classList.remove("dragging")
        this.draggedElement = null
      })
    })

    columns.forEach((column) => {
      column.addEventListener("dragover", (e) => {
        e.preventDefault()
        column.classList.add("drag-over")
      })

      column.addEventListener("dragleave", () => {
        column.classList.remove("drag-over")
      })

      column.addEventListener("drop", (e) => {
        e.preventDefault()
        column.classList.remove("drag-over")

        if (this.draggedElement) {
          const bugId = this.draggedElement.dataset.bugId
          const newStatus = column.parentElement.dataset.status
          this.updateBugStatus(bugId, newStatus)
        }
      })
    })
  }

  async updateBugStatus(bugId, newStatus) {
    try {
      const response = await fetch("../backend/api/update_bug_status.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bug_id: bugId,
          status: newStatus,
        }),
      })

      const data = await response.json()
      if (data.success) {
        window.showNotification("Bug status updated successfully", "success")
        await this.loadBugs() // Refresh the board
      } else {
        window.showNotification(data.message || "Error updating bug status", "error")
      }
    } catch (error) {
      console.error("Error updating bug status:", error)
      window.showNotification("Error updating bug status", "error")
    }
  }

  setupEventListeners() {
    document.getElementById("projectFilter").addEventListener("change", () => {
      this.loadBugs()
    })
  }
}

// Global functions
async function refreshBoard() {
  kanban.loadBugs()
}

async function openBugModal(bugId) {
  try {
    const response = await fetch(`../backend/api/bug_details.php?id=${bugId}`)
    const data = await response.json()

    if (data.success) {
      const bug = data.bug
      document.getElementById("bugModalContent").innerHTML = `
                <h2>Bug #${bug.id}: ${bug.title}</h2>
                <div class="bug-details">
                    <p><strong>Status:</strong> <span class="status-badge ${bug.status}">${bug.status}</span></p>
                    <p><strong>Priority:</strong> <span class="priority-badge ${bug.priority.toLowerCase()}">${bug.priority}</span></p>
                    <p><strong>Project:</strong> ${bug.project_name}</p>
                    <p><strong>Assigned to:</strong> ${bug.assigned_to || "Unassigned"}</p>
                    <p><strong>Created:</strong> ${new Date(bug.created_at).toLocaleString()}</p>
                    <p><strong>Description:</strong></p>
                    <div class="bug-description-full">${bug.description}</div>
                </div>
                <div class="modal-actions">
                    <button onclick="window.location.href='../bugs/details.html?id=${bug.id}'" class="btn btn-primary">
                        View Full Details
                    </button>
                </div>
            `
      document.getElementById("bugModal").style.display = "block"
    }
  } catch (error) {
    console.error("Error loading bug details:", error)
    window.showNotification("Error loading bug details", "error")
  }
}

function closeBugModal() {
  document.getElementById("bugModal").style.display = "none"
}

// Initialize kanban board when page loads
let kanban
document.addEventListener("DOMContentLoaded", () => {
  kanban = new KanbanBoard()
})

// Close modal when clicking outside
window.onclick = (event) => {
  const modal = document.getElementById("bugModal")
  if (event.target === modal) {
    closeBugModal()
  }
}

// Declare showNotification function
function showNotification(message, type) {
  const notification = document.createElement("div")
  notification.classList.add("notification", type)
  notification.textContent = message
  document.body.appendChild(notification)

  setTimeout(() => {
    document.body.removeChild(notification)
  }, 3000)
}
