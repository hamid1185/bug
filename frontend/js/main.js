// Main JavaScript file for BugSage frontend
class BugSageApp {
  constructor() {
    this.apiBase = "../backend/api"
    this.init()
  }

  init() {
    this.setupEventListeners()
    this.checkAuthStatus()
  }

  setupEventListeners() {
    // Mobile menu toggle
    const mobileMenuBtn = document.querySelector("[data-mobile-menu]")
    const mobileMenu = document.querySelector("[data-mobile-menu-content]")

    if (mobileMenuBtn && mobileMenu) {
      mobileMenuBtn.addEventListener("click", () => {
        mobileMenu.classList.toggle("hidden")
      })
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", function (e) {
        e.preventDefault()
        const target = document.querySelector(this.getAttribute("href"))
        if (target) {
          target.scrollIntoView({
            behavior: "smooth",
            block: "start",
          })
        }
      })
    })

    // Form submissions
    document.addEventListener("submit", (e) => {
      if (e.target.matches(".auth-form")) {
        this.handleAuthForm(e)
      }
    })
  }

  async checkAuthStatus() {
    try {
      const response = await fetch(`${this.apiBase}/auth/check.php`, {
        credentials: "include",
      })
      const data = await response.json()

      if (data.authenticated) {
        // User is logged in, redirect to dashboard if on auth pages
        if (window.location.pathname.includes("/auth/")) {
          window.location.href = "../dashboard/index.html"
        }
      }
    } catch (error) {
      console.log("Auth check failed:", error)
    }
  }

  async handleAuthForm(e) {
    e.preventDefault()
    const form = e.target
    const formData = new FormData(form)
    const endpoint = form.dataset.endpoint

    try {
      const response = await fetch(`${this.apiBase}/auth/${endpoint}.php`, {
        method: "POST",
        body: formData,
        credentials: "include",
      })

      const data = await response.json()

      if (data.success) {
        if (endpoint === "login" || endpoint === "register") {
          window.location.href = "../dashboard/index.html"
        }
      } else {
        this.showError(data.message || "An error occurred")
      }
    } catch (error) {
      this.showError("Network error. Please try again.")
    }
  }

  showError(message) {
    // Remove existing error messages
    document.querySelectorAll(".error-message").forEach((el) => el.remove())

    // Create new error message
    const errorDiv = document.createElement("div")
    errorDiv.className = "error-message bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4"
    errorDiv.textContent = message

    // Insert at the top of the form
    const form = document.querySelector(".auth-form")
    if (form) {
      form.insertBefore(errorDiv, form.firstChild)
    }
  }

  showSuccess(message) {
    // Remove existing messages
    document.querySelectorAll(".success-message, .error-message").forEach((el) => el.remove())

    // Create new success message
    const successDiv = document.createElement("div")
    successDiv.className = "success-message bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4"
    successDiv.textContent = message

    // Insert at the top of the form
    const form = document.querySelector(".auth-form")
    if (form) {
      form.insertBefore(successDiv, form.firstChild)
    }
  }

  // Utility function for API calls
  async apiCall(endpoint, options = {}) {
    const defaultOptions = {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    }

    const response = await fetch(`${this.apiBase}/${endpoint}`, {
      ...defaultOptions,
      ...options,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  }

  // Format date utility
  formatDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Get priority color utility
  getPriorityColor(priority) {
    const colors = {
      Critical: "bg-red-500",
      High: "bg-orange-500",
      Medium: "bg-yellow-500",
      Low: "bg-green-500",
    }
    return colors[priority] || "bg-gray-500"
  }

  // Get status color utility
  getStatusColor(status) {
    const colors = {
      New: "bg-blue-500",
      "In Progress": "bg-purple-500",
      Resolved: "bg-green-500",
      Closed: "bg-gray-500",
    }
    return colors[status] || "bg-gray-500"
  }
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.bugSageApp = new BugSageApp()
})

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = BugSageApp
}
