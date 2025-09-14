// Bug Form JavaScript
class BugForm {
  constructor() {
    this.apiBase = "../backend/api"
    this.attachedFiles = []
    this.duplicateCheckTimeout = null
    this.init()
  }

  async init() {
    await this.checkAuth()
    this.setupEventListeners()
    await this.loadFormData()
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
    // Form submission
    const form = document.getElementById("bugForm")
    if (form) {
      form.addEventListener("submit", (e) => this.handleSubmit(e))
    }

    // Title change for duplicate detection
    const titleInput = document.getElementById("title")
    if (titleInput) {
      titleInput.addEventListener("input", (e) => {
        clearTimeout(this.duplicateCheckTimeout)
        this.duplicateCheckTimeout = setTimeout(() => {
          this.checkForDuplicates(e.target.value)
        }, 1000)
      })
    }

    // File upload
    const fileUploadArea = document.getElementById("fileUploadArea")
    const fileInput = document.getElementById("attachments")

    if (fileUploadArea && fileInput) {
      fileUploadArea.addEventListener("click", () => fileInput.click())
      fileUploadArea.addEventListener("dragover", (e) => {
        e.preventDefault()
        fileUploadArea.classList.add("dragover")
      })
      fileUploadArea.addEventListener("dragleave", () => {
        fileUploadArea.classList.remove("dragover")
      })
      fileUploadArea.addEventListener("drop", (e) => {
        e.preventDefault()
        fileUploadArea.classList.remove("dragover")
        this.handleFiles(e.dataTransfer.files)
      })

      fileInput.addEventListener("change", (e) => {
        this.handleFiles(e.target.files)
      })
    }

    // Auto-detect browser info
    this.detectBrowserInfo()

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

    window.hideDuplicateAlert = () => {
      document.getElementById("duplicateAlert").style.display = "none"
    }

    window.reviewDuplicates = () => {
      // Open duplicates in new tabs
      const duplicateLinks = document.querySelectorAll("#duplicateList a")
      duplicateLinks.forEach((link) => {
        window.open(link.href, "_blank")
      })
    }

    window.saveDraft = () => {
      this.saveDraft()
    }

    // Close dropdowns when clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".user-menu")) {
        document.getElementById("userDropdown").classList.remove("show")
      }
    })
  }

  async loadFormData() {
    await Promise.all([this.loadProjects(), this.loadUsers()])
  }

  async loadProjects() {
    try {
      const response = await fetch(`${this.apiBase}/projects/list.php`, {
        credentials: "include",
      })
      const data = await response.json()

      if (data.success) {
        const projectSelect = document.getElementById("project")
        data.data.forEach((project) => {
          const option = document.createElement("option")
          option.value = project.project_id
          option.textContent = project.name
          projectSelect.appendChild(option)
        })
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
        const assigneeSelect = document.getElementById("assignee")
        data.data.forEach((user) => {
          const option = document.createElement("option")
          option.value = user.user_id
          option.textContent = user.name
          assigneeSelect.appendChild(option)
        })
      }
    } catch (error) {
      console.error("Failed to load users:", error)
    }
  }

  async checkForDuplicates(title) {
    if (!title || title.length < 10) return

    try {
      const response = await fetch(`${this.apiBase}/bugs/check-duplicates.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title }),
        credentials: "include",
      })

      const data = await response.json()

      if (data.success && data.data && data.data.length > 0) {
        this.showDuplicateAlert(data.data)
      } else {
        this.hideDuplicateAlert()
      }
    } catch (error) {
      console.error("Duplicate check failed:", error)
    }
  }

  showDuplicateAlert(duplicates) {
    const alert = document.getElementById("duplicateAlert")
    const list = document.getElementById("duplicateList")

    const duplicatesHtml = duplicates
      .map(
        (bug) => `
      <div class="duplicate-item">
        <a href="details.html?id=${bug.bug_id}" target="_blank">
          #${bug.bug_id}: ${this.escapeHtml(bug.title)}
        </a>
        <div class="duplicate-meta">
          <span class="badge priority-${bug.priority.toLowerCase()}">${bug.priority}</span>
          <span class="badge status-${bug.status.toLowerCase().replace(" ", "-")}">${bug.status}</span>
        </div>
      </div>
    `,
      )
      .join("")

    list.innerHTML = duplicatesHtml
    alert.style.display = "block"
  }

  hideDuplicateAlert() {
    document.getElementById("duplicateAlert").style.display = "none"
  }

  handleFiles(files) {
    Array.from(files).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        this.showError(`File ${file.name} is too large. Maximum size is 10MB.`)
        return
      }

      this.attachedFiles.push(file)
      this.addFileToList(file)
    })
  }

  addFileToList(file) {
    const fileList = document.getElementById("fileList")
    const fileItem = document.createElement("div")
    fileItem.className = "file-item"
    fileItem.innerHTML = `
      <div class="file-info">
        <i class="fas ${this.getFileIcon(file.type)} file-icon"></i>
        <div class="file-details">
          <div class="file-name">${this.escapeHtml(file.name)}</div>
          <div class="file-size">${this.formatFileSize(file.size)}</div>
        </div>
      </div>
      <button type="button" class="file-remove" onclick="bugForm.removeFile('${file.name}')">
        <i class="fas fa-times"></i>
      </button>
    `
    fileList.appendChild(fileItem)
  }

  removeFile(fileName) {
    this.attachedFiles = this.attachedFiles.filter((file) => file.name !== fileName)
    const fileList = document.getElementById("fileList")
    const fileItems = fileList.querySelectorAll(".file-item")
    fileItems.forEach((item) => {
      if (item.querySelector(".file-name").textContent === fileName) {
        item.remove()
      }
    })
  }

  getFileIcon(mimeType) {
    if (mimeType.startsWith("image/")) return "fa-image"
    if (mimeType.includes("pdf")) return "fa-file-pdf"
    if (mimeType.includes("word")) return "fa-file-word"
    if (mimeType.includes("text")) return "fa-file-text"
    return "fa-file"
  }

  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  detectBrowserInfo() {
    const browserInfo = document.getElementById("browserInfo")
    if (browserInfo && !browserInfo.value) {
      const userAgent = navigator.userAgent
      let browser = "Unknown"
      let version = ""

      if (userAgent.includes("Chrome")) {
        browser = "Chrome"
        version = userAgent.match(/Chrome\/([0-9.]+)/)?.[1] || ""
      } else if (userAgent.includes("Firefox")) {
        browser = "Firefox"
        version = userAgent.match(/Firefox\/([0-9.]+)/)?.[1] || ""
      } else if (userAgent.includes("Safari")) {
        browser = "Safari"
        version = userAgent.match(/Version\/([0-9.]+)/)?.[1] || ""
      } else if (userAgent.includes("Edge")) {
        browser = "Edge"
        version = userAgent.match(/Edge\/([0-9.]+)/)?.[1] || ""
      }

      const platform = navigator.platform
      browserInfo.value = `${browser} ${version}, ${platform}`
    }
  }

  async handleSubmit(e) {
    e.preventDefault()

    const form = e.target
    const submitBtn = form.querySelector('button[type="submit"]')
    const originalText = submitBtn.innerHTML

    // Show loading state
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating...'
    submitBtn.disabled = true

    try {
      const formData = new FormData(form)

      // Add attached files
      this.attachedFiles.forEach((file, index) => {
        formData.append(`attachments[${index}]`, file)
      })

      const response = await fetch(`${this.apiBase}/bugs/create.php`, {
        method: "POST",
        body: formData,
        credentials: "include",
      })

      const data = await response.json()

      if (data.success) {
        this.showSuccess("Bug report created successfully!")
        setTimeout(() => {
          window.location.href = `details.html?id=${data.bug_id}`
        }, 1500)
      } else {
        this.showError(data.message || "Failed to create bug report")
      }
    } catch (error) {
      console.error("Form submission failed:", error)
      this.showError("Network error. Please try again.")
    } finally {
      // Restore button state
      submitBtn.innerHTML = originalText
      submitBtn.disabled = false
    }
  }

  async saveDraft() {
    const form = document.getElementById("bugForm")
    const formData = new FormData(form)

    try {
      const response = await fetch(`${this.apiBase}/bugs/save-draft.php`, {
        method: "POST",
        body: formData,
        credentials: "include",
      })

      const data = await response.json()

      if (data.success) {
        this.showSuccess("Draft saved successfully!")
      } else {
        this.showError(data.message || "Failed to save draft")
      }
    } catch (error) {
      console.error("Save draft failed:", error)
      this.showError("Failed to save draft")
    }
  }

  escapeHtml(text) {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
  }

  showError(message) {
    this.showToast(message, "error")
  }

  showSuccess(message) {
    this.showToast(message, "success")
  }

  showToast(message, type) {
    const toast = document.createElement("div")
    toast.className = `toast ${type}`
    toast.innerHTML = `
      <i class="fas ${type === "error" ? "fa-exclamation-circle" : "fa-check-circle"}"></i>
      <span>${message}</span>
    `

    // Add toast styles if not already present
    if (!document.querySelector(".toast-styles")) {
      const style = document.createElement("style")
      style.className = "toast-styles"
      style.textContent = `
        .toast {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 1rem 1.5rem;
          border-radius: var(--radius);
          color: white;
          font-weight: 500;
          z-index: 1000;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          animation: slideIn 0.3s ease;
        }
        .toast.error {
          background-color: #ef4444;
        }
        .toast.success {
          background-color: #22c55e;
        }
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `
      document.head.appendChild(style)
    }

    document.body.appendChild(toast)

    setTimeout(() => {
      toast.remove()
    }, 5000)
  }
}

// Initialize bug form when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.bugForm = new BugForm()
})
