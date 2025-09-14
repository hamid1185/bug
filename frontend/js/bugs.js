// Bug Management JavaScript
class BugManager {
  constructor() {
    this.apiBase = "../backend/api"
    this.currentPage = 1
    this.pageSize = 20
    this.currentView = "list"
    this.filters = {}
    this.sortBy = "created_at"
    this.sortOrder = "desc"
    this.init()
  }

  async init() {
    await this.checkAuth()
    this.setupEventListeners()
    await this.loadInitialData()
  }

  async checkAuth() {
    try {
      const response = await fetch(`${this.apiBase}/auth/check.php`, {
        credentials: "include",
      })
      const data = await response.json()

      if (!data.authenticated) {
        window.location.href = "../auth/login.html"
        return
      }

      // Update user info in navigation
      document.getElementById("userName").textContent = data.user.name
      document.getElementById("userRole").textContent = data.user.role

      // Show admin links if user is admin
      if (data.user.role === "Admin") {
        document.querySelectorAll(".admin-only").forEach((el) => {
          el.style.display = "flex"
        })
      }
    } catch (error) {
      console.error("Auth check failed:", error)
      window.location.href = "../auth/login.html"
    }
  }

  setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById("searchInput")
    const searchClear = document.getElementById("searchClear")

    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        if (e.target.value) {
          searchClear.style.display = "block"
        } else {
          searchClear.style.display = "none"
        }
        this.debounce(() => this.handleSearch(e.target.value), 300)()
      })
    }

    if (searchClear) {
      searchClear.addEventListener("click", () => {
        searchInput.value = ""
        searchClear.style.display = "none"
        this.handleSearch("")
      })
    }

    // Filter change handlers
    document.querySelectorAll(".filter-select").forEach((select) => {
      select.addEventListener("change", () => {
        this.applyFilters()
      })
    })

    // Sort handlers
    document.querySelectorAll(".sortable").forEach((th) => {
      th.addEventListener("click", () => {
        const sortField = th.dataset.sort
        if (this.sortBy === sortField) {
          this.sortOrder = this.sortOrder === "asc" ? "desc" : "asc"
        } else {
          this.sortBy = sortField
          this.sortOrder = "asc"
        }
        this.updateSortIndicators()
        this.loadBugs()
      })
    })

    // Global functions
    window.toggleUserMenu = () => {
      const dropdown = document.getElementById("userDropdown")
      dropdown.classList.toggle("show")
    }

    window.toggleMobileMenu = () => {
      const mobileNav = document.getElementById("mobileNav")
      mobileNav.classList.toggle("show")
    }

    window.logout = async () => {
      try {
        await fetch(`${this.apiBase}/auth/logout.php`, {
          method: "POST",
          credentials: "include",
        })
        window.location.href = "../auth/login.html"
      } catch (error) {
        console.error("Logout failed:", error)
      }
    }

    window.switchView = (view) => {
      this.currentView = view
      document.querySelectorAll(".view-btn").forEach((btn) => {
        btn.classList.remove("active")
      })
      document.querySelector(`[data-view="${view}"]`).classList.add("active")

      if (view === "list") {
        document.getElementById("listView").style.display = "block"
        document.getElementById("gridView").style.display = "none"
      } else {
        document.getElementById("listView").style.display = "none"
        document.getElementById("gridView").style.display = "block"
      }
    }

    window.clearFilters = () => {
      document.querySelectorAll(".filter-select").forEach((select) => {
        select.value = ""
      })
      document.getElementById("searchInput").value = ""
      document.getElementById("searchClear").style.display = "none"
      this.filters = {}
      this.loadBugs()
    }

    window.applyFilters = () => {
      this.applyFilters()
    }

    // Close dropdowns when clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".user-menu")) {
        document.getElementById("userDropdown").classList.remove("show")
      }
    })
  }

  async loadInitialData() {
    await Promise.all([this.loadProjects(), this.loadUsers(), this.loadBugs()])
  }

  async loadProjects() {
    try {
      const response = await fetch(`${this.apiBase}/projects/list.php`, {
        credentials: "include",
      })
      const data = await response.json()

      if (data.success) {
        const projectSelect = document.getElementById("projectFilter")
        if (projectSelect) {
          data.data.forEach((project) => {
            const option = document.createElement("option")
            option.value = project.project_id
            option.textContent = project.name
            projectSelect.appendChild(option)
          })
        }
      }
    } catch (error) {
      console.error("Failed to load projects:", error)
    }
  }

  async loadUsers() {
    try {
      const response = await fetch(`${this.apiBase}/users/list.php`, {
        credentials: "include",
      })
      const data = await response.json()

      if (data.success) {
        const assigneeSelect = document.getElementById("assigneeFilter")
        if (assigneeSelect) {
          data.data.forEach((user) => {
            const option = document.createElement("option")
            option.value = user.user_id
            option.textContent = user.name
            assigneeSelect.appendChild(option)
          })
        }
      }
    } catch (error) {
      console.error("Failed to load users:", error)
    }
  }

  async loadBugs() {
    try {
      const params = new URLSearchParams({
        page: this.currentPage,
        limit: this.pageSize,
        sort: this.sortBy,
        order: this.sortOrder,
        ...this.filters,
      })

      const response = await fetch(`${this.apiBase}/bugs/list.php?${params}`, {
        credentials: "include",
      })
      const data = await response.json()

      if (data.success) {
        this.updateBugsList(data.data)
        this.updatePagination(data.pagination)
        this.updateResultsCount(data.pagination.total)
      } else {
        this.showError(data.message || "Failed to load bugs")
      }
    } catch (error) {
      console.error("Failed to load bugs:", error)
      this.showError("Failed to load bugs")
    }
  }

  updateBugsList(bugs) {
    if (this.currentView === "list") {
      this.updateListView(bugs)
    } else {
      this.updateGridView(bugs)
    }
  }

  updateListView(bugs) {
    const tbody = document.getElementById("bugsTableBody")

    if (!bugs || bugs.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            <i class="fas fa-inbox"></i>
            <p>No bugs found</p>
          </td>
        </tr>
      `
      return
    }

    const bugsHtml = bugs
      .map(
        (bug) => `
      <tr>
        <td>#${bug.bug_id}</td>
        <td>
          <a href="details.html?id=${bug.bug_id}" class="bug-title">
            ${this.escapeHtml(this.truncateText(bug.title, 60))}
          </a>
        </td>
        <td class="hidden-mobile">
          <span class="badge priority-${bug.priority.toLowerCase()}">${bug.priority}</span>
        </td>
        <td class="hidden-mobile">
          <span class="badge status-${bug.status.toLowerCase().replace(" ", "-")}">${bug.status}</span>
        </td>
        <td class="hidden-mobile">${bug.assignee_name || "Unassigned"}</td>
        <td class="hidden-tablet">${this.formatDate(bug.created_at)}</td>
        <td>
          <a href="details.html?id=${bug.bug_id}" class="btn btn-outline btn-sm">
            <i class="fas fa-eye"></i>
          </a>
        </td>
      </tr>
    `,
      )
      .join("")

    tbody.innerHTML = bugsHtml
  }

  updateGridView(bugs) {
    const grid = document.getElementById("bugsGrid")

    if (!bugs || bugs.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-inbox"></i>
          <p>No bugs found</p>
        </div>
      `
      return
    }

    const bugsHtml = bugs
      .map(
        (bug) => `
      <div class="bug-card">
        <div class="bug-card-header">
          <a href="details.html?id=${bug.bug_id}" class="bug-card-title">
            ${this.escapeHtml(this.truncateText(bug.title, 80))}
          </a>
          <span class="bug-card-id">#${bug.bug_id}</span>
        </div>
        <div class="bug-card-badges">
          <span class="badge priority-${bug.priority.toLowerCase()}">${bug.priority}</span>
          <span class="badge status-${bug.status.toLowerCase().replace(" ", "-")}">${bug.status}</span>
        </div>
        <div class="bug-card-description">
          ${this.escapeHtml(this.truncateText(bug.description || "", 120))}
        </div>
        <div class="bug-card-footer">
          <span>Created ${this.formatDate(bug.created_at)}</span>
          <span>${bug.assignee_name || "Unassigned"}</span>
        </div>
      </div>
    `,
      )
      .join("")

    grid.innerHTML = bugsHtml
  }

  updatePagination(pagination) {
    const paginationContainer = document.getElementById("pagination")
    const { current_page, total_pages, total, per_page } = pagination

    // Update pagination info
    const start = (current_page - 1) * per_page + 1
    const end = Math.min(current_page * per_page, total)

    document.getElementById("paginationStart").textContent = start
    document.getElementById("paginationEnd").textContent = end
    document.getElementById("paginationTotal").textContent = total

    // Generate pagination buttons
    let paginationHtml = ""

    // Previous button
    if (current_page > 1) {
      paginationHtml += `
        <button class="pagination-btn" onclick="bugManager.goToPage(${current_page - 1})">
          <i class="fas fa-chevron-left"></i>
        </button>
      `
    }

    // Page numbers
    const startPage = Math.max(1, current_page - 2)
    const endPage = Math.min(total_pages, current_page + 2)

    if (startPage > 1) {
      paginationHtml += `
        <button class="pagination-btn" onclick="bugManager.goToPage(1)">1</button>
      `
      if (startPage > 2) {
        paginationHtml += `<span class="pagination-ellipsis">...</span>`
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      paginationHtml += `
        <button class="pagination-btn ${i === current_page ? "active" : ""}" 
                onclick="bugManager.goToPage(${i})">
          ${i}
        </button>
      `
    }

    if (endPage < total_pages) {
      if (endPage < total_pages - 1) {
        paginationHtml += `<span class="pagination-ellipsis">...</span>`
      }
      paginationHtml += `
        <button class="pagination-btn" onclick="bugManager.goToPage(${total_pages})">
          ${total_pages}
        </button>
      `
    }

    // Next button
    if (current_page < total_pages) {
      paginationHtml += `
        <button class="pagination-btn" onclick="bugManager.goToPage(${current_page + 1})">
          <i class="fas fa-chevron-right"></i>
        </button>
      `
    }

    paginationContainer.innerHTML = paginationHtml
  }

  updateResultsCount(total) {
    document.getElementById("resultsCount").textContent = total
  }

  updateSortIndicators() {
    document.querySelectorAll(".sortable i").forEach((icon) => {
      icon.className = "fas fa-sort"
    })

    const activeSortHeader = document.querySelector(`[data-sort="${this.sortBy}"] i`)
    if (activeSortHeader) {
      activeSortHeader.className = `fas fa-sort-${this.sortOrder === "asc" ? "up" : "down"}`
    }
  }

  goToPage(page) {
    this.currentPage = page
    this.loadBugs()
  }

  handleSearch(query) {
    if (query.trim()) {
      this.filters.search = query.trim()
    } else {
      delete this.filters.search
    }
    this.currentPage = 1
    this.loadBugs()
  }

  applyFilters() {
    this.filters = {}

    // Get filter values
    const status = document.getElementById("statusFilter").value
    const priority = document.getElementById("priorityFilter").value
    const assignee = document.getElementById("assigneeFilter").value
    const project = document.getElementById("projectFilter").value
    const search = document.getElementById("searchInput").value

    if (status) this.filters.status = status
    if (priority) this.filters.priority = priority
    if (assignee) this.filters.assignee = assignee
    if (project) this.filters.project = project
    if (search) this.filters.search = search

    this.currentPage = 1
    this.loadBugs()
  }

  debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  escapeHtml(text) {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
  }

  formatDate(dateString) {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return "Today"
    if (diffDays === 2) return "Yesterday"
    if (diffDays <= 7) return `${diffDays} days ago`

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    })
  }

  showError(message) {
    // Create a toast notification for errors
    const toast = document.createElement("div")
    toast.className = "toast error"
    toast.innerHTML = `
      <i class="fas fa-exclamation-circle"></i>
      <span>${message}</span>
    `
    document.body.appendChild(toast)

    setTimeout(() => {
      toast.remove()
    }, 5000)
  }
}

// Initialize bug manager when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.bugManager = new BugManager()
})
