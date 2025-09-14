class ReportsManager {
  constructor() {
    this.charts = {}
    this.init()
  }

  async init() {
    await this.loadReportData()
    this.setupEventListeners()
  }

  async loadReportData() {
    try {
      const timeRange = document.getElementById("timeRange").value
      const response = await fetch(`../backend/api/reports.php?range=${timeRange}`)
      const data = await response.json()

      if (data.success) {
        this.updateSummaryCards(data.summary)
        this.renderCharts(data.charts)
        this.updateTables(data.tables)
      }
    } catch (error) {
      console.error("Error loading report data:", error)
      window.showNotification("Error loading report data", "error")
    }
  }

  updateSummaryCards(summary) {
    document.getElementById("totalBugs").textContent = summary.total_bugs || 0
    document.getElementById("resolvedBugs").textContent = summary.resolved_bugs || 0
    document.getElementById("avgResolutionTime").textContent = summary.avg_resolution_time || 0
    document.getElementById("criticalBugs").textContent = summary.critical_bugs || 0
  }

  renderCharts(chartData) {
    this.renderBugTrendChart(chartData.trend)
    this.renderStatusChart(chartData.status)
    this.renderPriorityChart(chartData.priority)
  }

  renderBugTrendChart(data) {
    const ctx = document.getElementById("bugTrendChart").getContext("2d")

    if (this.charts.trend) {
      this.charts.trend.destroy()
    }

    this.charts.trend = new window.Chart(ctx, {
      type: "line",
      data: {
        labels: data.labels || [],
        datasets: [
          {
            label: "Bugs Reported",
            data: data.reported || [],
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            tension: 0.4,
          },
          {
            label: "Bugs Resolved",
            data: data.resolved || [],
            borderColor: "#10b981",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    })
  }

  renderStatusChart(data) {
    const ctx = document.getElementById("statusChart").getContext("2d")

    if (this.charts.status) {
      this.charts.status.destroy()
    }

    this.charts.status = new window.Chart(ctx, {
      type: "doughnut",
      data: {
        labels: data.labels || [],
        datasets: [
          {
            data: data.values || [],
            backgroundColor: ["#ef4444", "#f59e0b", "#3b82f6", "#10b981"],
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

  renderPriorityChart(data) {
    const ctx = document.getElementById("priorityChart").getContext("2d")

    if (this.charts.priority) {
      this.charts.priority.destroy()
    }

    this.charts.priority = new window.Chart(ctx, {
      type: "bar",
      data: {
        labels: data.labels || [],
        datasets: [
          {
            label: "Bug Count",
            data: data.values || [],
            backgroundColor: ["#dc2626", "#d97706", "#16a34a"],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    })
  }

  updateTables(tables) {
    this.updateProjectStatsTable(tables.projects)
    this.updateTeamStatsTable(tables.team)
  }

  updateProjectStatsTable(projects) {
    const tbody = document.getElementById("projectStatsTable")
    tbody.innerHTML = projects
      .map(
        (project) => `
            <tr>
                <td>${project.name}</td>
                <td>${project.total_bugs}</td>
                <td>${project.open_bugs}</td>
                <td>${project.in_progress_bugs}</td>
                <td>${project.resolved_bugs}</td>
                <td>${project.resolution_rate}%</td>
            </tr>
        `,
      )
      .join("")
  }

  updateTeamStatsTable(team) {
    const tbody = document.getElementById("teamStatsTable")
    tbody.innerHTML = team
      .map(
        (member) => `
            <tr>
                <td>${member.name}</td>
                <td>${member.assigned_bugs}</td>
                <td>${member.resolved_bugs}</td>
                <td>${member.avg_resolution_time} days</td>
                <td>
                    <div class="performance-score ${member.performance_class}">
                        ${member.performance_score}%
                    </div>
                </td>
            </tr>
        `,
      )
      .join("")
  }

  setupEventListeners() {
    document.getElementById("timeRange").addEventListener("change", () => {
      this.loadReportData()
    })
  }
}

// Global functions
async function exportReport() {
  try {
    const timeRange = document.getElementById("timeRange").value
    const response = await fetch(`../backend/api/export_report.php?range=${timeRange}&format=pdf`)

    if (response.ok) {
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `bug_report_${new Date().toISOString().split("T")[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      window.showNotification("Report exported successfully", "success")
    } else {
      throw new Error("Export failed")
    }
  } catch (error) {
    console.error("Error exporting report:", error)
    window.showNotification("Error exporting report", "error")
  }
}

// Initialize reports when page loads
let reportsManager
document.addEventListener("DOMContentLoaded", () => {
  reportsManager = new ReportsManager()
})
