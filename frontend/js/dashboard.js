// Dashboard specific JavaScript
class Dashboard {
  constructor() {
    this.apiBase = "../backend/api"
    this.charts = {}
    this.init()
  }

  async init() {
    await this.checkAuth()
    this.setupEventListeners()
    await this.loadDashboardData()
    this.initializeCharts()
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
      document.getElementById("welcomeName").textContent = data.user.name.split(" ")[0]

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
    // User menu toggle
    window.toggleUserMenu = () => {
      const dropdown = document.getElementById("userDropdown")
      dropdown.classList.toggle("show")
    }

    // Mobile menu toggle
    window.toggleMobileMenu = () => {
      const mobileNav = document.getElementById("mobileNav")
      mobileNav.classList.toggle("show")
    }

    // Logout function
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

    // Close dropdowns when clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".user-menu")) {
        document.getElementById("userDropdown").classList.remove("show")
      }
    })

    // Auto-refresh dashboard data every 30 seconds
    setInterval(() => {
      this.loadDashboardData()
    }, 30000)
  }

  async loadDashboardData() {
    try {
      // Load all dashboard data in parallel
      const [stats, myBugs, recentBugs, activity] = await Promise.all([
        this.loadStats(),
        this.loadMyBugs(),
        this.loadRecentBugs(),
        this.loadRecentActivity(),
      ])

      this.updateStats(stats)
      this.updateMyBugsList(myBugs)
      this.updateRecentBugsTable(recentBugs)
      this.updateRecentActivity(activity)
      this.updateCharts(stats)
    } catch (error) {
      console.error("Failed to load dashboard data:", error)
      this.showError("Failed to load dashboard data")
    }
  }

  async loadStats() {
    const response = await fetch(`${this.apiBase}/dashboard/stats.php`, {
      credentials: "include",
    })
    return await response.json()
  }

  async loadMyBugs() {
    const response = await fetch(`${this.apiBase}/bugs/my-bugs.php`, {
      credentials: "include",
    })
    return await response.json()
  }

  async loadRecentBugs() {
    const response = await fetch(`${this.apiBase}/bugs/recent.php?limit=10`, {
      credentials: "include",
    })
    return await response.json()
  }

  async loadRecentActivity() {
    const response = await fetch(`${this.apiBase}/activity/recent.php?limit=10`, {
      credentials: "include",
    })
    return await response.json()
  }

  updateStats(stats) {
    if (stats.success) {
      const data = stats.data
      document.getElementById("totalBugs").textContent = data.total_bugs || 0
      document.getElementById("activeBugs").textContent = data.active_bugs || 0
      document.getElementById("criticalBugs").textContent = data.critical_bugs || 0
      document.getElementById("myBugs").textContent = data.my_bugs || 0
      document.getElementById("newBugsCount").textContent = data.new_bugs || 0
      document.getElementById("inProgressCount").textContent = data.in_progress_bugs || 0
      document.getElementById("resolvedCount").textContent = data.resolved_bugs || 0
      document.getElementById("closedCount").textContent = data.closed_bugs || 0
    }
  }

  updateMyBugsList(response) {
    const container = document.getElementById("myBugsList")

    if (!response.success || !response.data || response.data.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-check-circle"></i>
          <p>All caught up! No bugs assigned to you.</p>
        </div>
      `
      return
    }

    const bugsHtml = response.data
      .slice(0, 5)
      .map(
        (bug) => `
      <div class="bug-item">
        <div class="bug-header">
          <a href="../bugs/details.html?id=${bug.bug_id}" class="bug-title">
            #${bug.bug_id}: ${this.truncateText(bug.title, 50)}
          </a>
          <div class="bug-badges">
            <span class="badge priority-${bug.priority.toLowerCase()}">${bug.priority}</span>
            <span class="badge status-${bug.status.toLowerCase().replace(" ", "-")}">${bug.status}</span>
          </div>
        </div>
      </div>
    `,
      )
      .join("")

    container.innerHTML = bugsHtml
  }

  updateRecentBugsTable(response) {
    const tbody = document.getElementById("recentBugsTable")

    if (!response.success || !response.data || response.data.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            <i class="fas fa-inbox"></i>
            <p>No recent bugs found</p>
          </td>
        </tr>
      `
      return
    }

    const bugsHtml = response.data
      .map(
        (bug) => `
      <tr>
        <td>#${bug.bug_id}</td>
        <td>
          <a href="../bugs/details.html?id=${bug.bug_id}" class="bug-title">
            ${this.truncateText(bug.title, 40)}
          </a>
        </td>
        <td class="hidden-mobile">
          <span class="badge priority-${bug.priority.toLowerCase()}">${bug.priority}</span>
        </td>
        <td class="hidden-mobile">
          <span class="badge status-${bug.status.toLowerCase().replace(" ", "-")}">${bug.status}</span>
        </td>
        <td class="hidden-mobile">${bug.assignee_name || "Unassigned"}</td>
        <td class="hidden-mobile">${this.formatDate(bug.created_at)}</td>
        <td>
          <a href="../bugs/details.html?id=${bug.bug_id}" class="btn btn-outline btn-sm">
            <i class="fas fa-eye"></i>
          </a>
        </td>
      </tr>
    `,
      )
      .join("")

    tbody.innerHTML = bugsHtml
  }

  updateRecentActivity(response) {
    const container = document.getElementById("recentActivity")

    if (!response.success || !response.data || response.data.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-history"></i>
          <p>No recent activity</p>
        </div>
      `
      return
    }

    const activityHtml = response.data
      .slice(0, 5)
      .map(
        (activity) => `
      <div class="activity-item">
        <div class="activity-icon ${this.getActivityIconClass(activity.type)}">
          <i class="fas ${this.getActivityIcon(activity.type)}"></i>
        </div>
        <div class="activity-content">
          <div class="activity-text">${activity.description}</div>
          <div class="activity-time">${this.formatDate(activity.created_at)}</div>
        </div>
      </div>
    `,
      )
      .join("")

    container.innerHTML = activityHtml
  }

  initializeCharts() {
    // Initialize priority distribution chart
    const ctx = document.getElementById("priorityChart")
    if (ctx) {
      window.Chart = window.Chart || {}
      window.Chart.priority = new window.Chart(ctx, {
        type: "doughnut",
        data: {
          labels: ["Critical", "High", "Medium", "Low"],
          datasets: [
            {
              data: [0, 0, 0, 0],
              backgroundColor: ["#ef4444", "#f97316", "#eab308", "#22c55e"],
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
            },
          },
        },
      })
    }
  }

  updateCharts(stats) {
    if (stats.success && window.Chart.priority) {
      const data = stats.data
      window.Chart.priority.data.datasets[0].data = [
        data.critical_bugs || 0,
        data.high_bugs || 0,
        data.medium_bugs || 0,
        data.low_bugs || 0,
      ]
      window.Chart.priority.update()
    }
  }

  getActivityIcon(type) {
    const icons = {
      bug_created: "fa-plus",
      bug_updated: "fa-edit",
      bug_assigned: "fa-user",
      bug_resolved: "fa-check",
      bug_closed: "fa-times",
      comment_added: "fa-comment",
    }
    return icons[type] || "fa-info"
  }

  getActivityIconClass(type) {
    const classes = {
      bug_created: "bg-blue",
      bug_updated: "bg-orange",
      bug_assigned: "bg-purple",
      bug_resolved: "bg-green",
      bug_closed: "bg-gray",
      comment_added: "bg-yellow",
    }
    return classes[type] || "bg-gray"
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
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

// Initialize dashboard when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.dashboard = new Dashboard()
})
