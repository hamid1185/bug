// Authentication specific JavaScript
class AuthManager {
  constructor() {
    this.apiBase = "../backend/api"
    this.init()
  }

  init() {
    this.setupFormValidation()
    this.setupPasswordToggle()
    this.setupPasswordStrength()
  }

  setupFormValidation() {
    // Real-time validation for registration form
    const registerForm = document.querySelector('[data-endpoint="register"]')
    if (registerForm) {
      const emailInput = registerForm.querySelector('[name="email"]')
      const passwordInput = registerForm.querySelector('[name="password"]')
      const confirmPasswordInput = registerForm.querySelector('[name="confirm_password"]')
      const nameInput = registerForm.querySelector('[name="name"]')

      if (emailInput) {
        emailInput.addEventListener("blur", () => this.validateEmail(emailInput))
        emailInput.addEventListener("input", () => this.clearFieldError(emailInput))
      }

      if (passwordInput) {
        passwordInput.addEventListener("input", () => {
          this.validatePassword(passwordInput)
          if (confirmPasswordInput.value) {
            this.validatePasswordMatch(passwordInput, confirmPasswordInput)
          }
        })
      }

      if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener("input", () => {
          this.validatePasswordMatch(passwordInput, confirmPasswordInput)
        })
      }

      if (nameInput) {
        nameInput.addEventListener("blur", () => this.validateName(nameInput))
        nameInput.addEventListener("input", () => this.clearFieldError(nameInput))
      }
    }

    // Form submission handling
    document.addEventListener("submit", (e) => {
      if (e.target.matches(".auth-form")) {
        this.handleFormSubmit(e)
      }
    })
  }

  setupPasswordToggle() {
    window.togglePassword = (inputId) => {
      const input = document.getElementById(inputId)
      const toggle = document.getElementById(`${inputId}-toggle`)

      if (input && toggle) {
        if (input.type === "password") {
          input.type = "text"
          toggle.className = "fas fa-eye-slash"
        } else {
          input.type = "password"
          toggle.className = "fas fa-eye"
        }
      }
    }
  }

  setupPasswordStrength() {
    const passwordInput = document.querySelector('[name="password"]')
    if (passwordInput) {
      // Create password strength indicator
      const strengthContainer = document.createElement("div")
      strengthContainer.className = "password-strength"
      strengthContainer.innerHTML = `
        <div class="password-strength-bar">
          <div class="password-strength-fill"></div>
        </div>
        <div class="password-strength-text"></div>
      `
      passwordInput.parentNode.appendChild(strengthContainer)

      passwordInput.addEventListener("input", () => {
        this.updatePasswordStrength(passwordInput.value, strengthContainer)
      })
    }
  }

  updatePasswordStrength(password, container) {
    const strength = this.calculatePasswordStrength(password)
    const bar = container.querySelector(".password-strength-fill")
    const text = container.querySelector(".password-strength-text")

    // Remove existing classes
    container.className = "password-strength"

    if (password.length === 0) {
      text.textContent = ""
      return
    }

    if (strength.score < 2) {
      container.classList.add("password-strength-weak")
      text.textContent = "Weak password"
    } else if (strength.score < 4) {
      container.classList.add("password-strength-medium")
      text.textContent = "Medium strength"
    } else {
      container.classList.add("password-strength-strong")
      text.textContent = "Strong password"
    }
  }

  calculatePasswordStrength(password) {
    let score = 0
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[^A-Za-z0-9]/.test(password),
    }

    Object.values(checks).forEach((check) => {
      if (check) score++
    })

    return { score, checks }
  }

  async handleFormSubmit(e) {
    e.preventDefault()
    const form = e.target
    const endpoint = form.dataset.endpoint

    // Show loading state
    form.classList.add("loading")
    const submitBtn = form.querySelector('button[type="submit"]')
    const originalText = submitBtn.innerHTML
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...'

    try {
      // Validate form before submission
      if (endpoint === "register" && !this.validateRegistrationForm(form)) {
        return
      }

      const formData = new FormData(form)
      const response = await fetch(`${this.apiBase}/auth/${endpoint}.php`, {
        method: "POST",
        body: formData,
        credentials: "include",
      })

      const data = await response.json()

      if (data.success) {
        this.showSuccess(data.message || "Success!")

        // Redirect after successful login/registration
        setTimeout(() => {
          if (endpoint === "login" || endpoint === "register") {
            window.location.href = "../dashboard/index.html"
          }
        }, 1000)
      } else {
        this.showError(data.message || "An error occurred")
      }
    } catch (error) {
      console.error("Auth error:", error)
      this.showError("Network error. Please try again.")
    } finally {
      // Remove loading state
      form.classList.remove("loading")
      submitBtn.innerHTML = originalText
    }
  }

  validateRegistrationForm(form) {
    let isValid = true
    const formData = new FormData(form)

    // Validate name
    const name = formData.get("name")
    if (!name || name.trim().length < 2) {
      this.showFieldError(form.querySelector('[name="name"]'), "Name must be at least 2 characters")
      isValid = false
    }

    // Validate email
    const email = formData.get("email")
    if (!this.isValidEmail(email)) {
      this.showFieldError(form.querySelector('[name="email"]'), "Please enter a valid email address")
      isValid = false
    }

    // Validate password
    const password = formData.get("password")
    if (password.length < 6) {
      this.showFieldError(form.querySelector('[name="password"]'), "Password must be at least 6 characters")
      isValid = false
    }

    // Validate password confirmation
    const confirmPassword = formData.get("confirm_password")
    if (password !== confirmPassword) {
      this.showFieldError(form.querySelector('[name="confirm_password"]'), "Passwords do not match")
      isValid = false
    }

    // Validate role
    const role = formData.get("role")
    if (!role) {
      this.showFieldError(form.querySelector('[name="role"]'), "Please select a role")
      isValid = false
    }

    // Validate terms
    const terms = formData.get("terms")
    if (!terms) {
      this.showError("Please accept the terms and conditions")
      isValid = false
    }

    return isValid
  }

  validateEmail(input) {
    const email = input.value
    if (email && !this.isValidEmail(email)) {
      this.showFieldError(input, "Please enter a valid email address")
      return false
    }
    this.showFieldSuccess(input)
    return true
  }

  validatePassword(input) {
    const password = input.value
    if (password && password.length < 6) {
      this.showFieldError(input, "Password must be at least 6 characters")
      return false
    }
    if (password) {
      this.showFieldSuccess(input)
    }
    return true
  }

  validatePasswordMatch(passwordInput, confirmInput) {
    const password = passwordInput.value
    const confirm = confirmInput.value

    if (confirm && password !== confirm) {
      this.showFieldError(confirmInput, "Passwords do not match")
      return false
    }
    if (confirm && password === confirm) {
      this.showFieldSuccess(confirmInput)
    }
    return true
  }

  validateName(input) {
    const name = input.value.trim()
    if (name && name.length < 2) {
      this.showFieldError(input, "Name must be at least 2 characters")
      return false
    }
    if (name) {
      this.showFieldSuccess(input)
    }
    return true
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  showFieldError(input, message) {
    this.clearFieldError(input)
    input.classList.add("invalid")
    input.classList.remove("valid")

    const errorDiv = document.createElement("div")
    errorDiv.className = "field-error"
    errorDiv.textContent = message
    input.parentNode.appendChild(errorDiv)
  }

  showFieldSuccess(input) {
    this.clearFieldError(input)
    input.classList.add("valid")
    input.classList.remove("invalid")
  }

  clearFieldError(input) {
    input.classList.remove("invalid", "valid")
    const existingError = input.parentNode.querySelector(".field-error")
    if (existingError) {
      existingError.remove()
    }
  }

  showError(message) {
    this.clearMessages()
    const form = document.querySelector(".auth-form")
    if (form) {
      const errorDiv = document.createElement("div")
      errorDiv.className = "error-message"
      errorDiv.innerHTML = `<i class="fas fa-exclamation-circle mr-2"></i>${message}`
      form.insertBefore(errorDiv, form.firstChild)
    }
  }

  showSuccess(message) {
    this.clearMessages()
    const form = document.querySelector(".auth-form")
    if (form) {
      const successDiv = document.createElement("div")
      successDiv.className = "success-message"
      successDiv.innerHTML = `<i class="fas fa-check-circle mr-2"></i>${message}`
      form.insertBefore(successDiv, form.firstChild)
    }
  }

  clearMessages() {
    document.querySelectorAll(".error-message, .success-message").forEach((el) => el.remove())
  }
}

// Initialize auth manager when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.authManager = new AuthManager()
})
