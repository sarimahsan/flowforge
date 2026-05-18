import { useState } from "react"

const API_URL = "/api"

export default function CalendarScheduler({ campaign }) {
  const [scheduleTime, setScheduleTime] = useState("")
  const [followupDays, setFollowupDays] = useState(3)
  const [loading, setLoading] = useState(false)
  const [scheduled, setScheduled] = useState([])
  const [error, setError] = useState("")

  if (!campaign || !campaign.company) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>📅 Schedule Campaign</h3>
        <div style={styles.notice}>
          📌 Generate a campaign first to unlock scheduling
        </div>
      </div>
    )
  }

  const handleScheduleCampaign = async () => {
    if (!scheduleTime) {
      setError("Please select a time")
      return
    }

    setLoading(true)
    setError("")
    
    try {
      const res = await fetch(`${API_URL}/calendar/schedule-campaign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: campaign.company,
          campaign_name: campaign.name,
          send_time: new Date(scheduleTime).toISOString()
        })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.detail || "Failed to schedule")
      }
      
      const data = await res.json()
      setScheduled([...scheduled, { type: "campaign", ...data }])
      setScheduleTime("")
      setError("")
    } catch (err) {
      setError(err.message || "Failed to schedule campaign")
    } finally {
      setLoading(false)
    }
  }

  const handleScheduleFollowup = async () => {
    if (!scheduleTime) {
      setError("Please select a time for initial send")
      return
    }

    setLoading(true)
    setError("")
    
    try {
      const res = await fetch(`${API_URL}/calendar/schedule-followup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_name: campaign.name,
          initial_time: new Date(scheduleTime).toISOString(),
          followup_days: followupDays
        })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.detail || "Failed to schedule follow-up")
      }
      
      const data = await res.json()
      setScheduled([...scheduled, { type: "followup", ...data }])
      setError("")
    } catch (err) {
      setError(err.message || "Failed to schedule follow-up")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>📅 Schedule Campaign</h3>
      
      {/* Campaign Info */}
      <div style={styles.infoBox}>
        <div style={styles.infoPair}>
          <span style={styles.infoLabel}>Campaign:</span>
          <span style={styles.infoValue}>{campaign.name}</span>
        </div>
        <div style={styles.infoPair}>
          <span style={styles.infoLabel}>Company:</span>
          <span style={styles.infoValue}>{campaign.company}</span>
        </div>
      </div>
      
      <div style={styles.inputGroup}>
        <label style={styles.label}>📤 Campaign Send Time</label>
        <input
          type="datetime-local"
          value={scheduleTime}
          onChange={(e) => setScheduleTime(e.target.value)}
          style={styles.input}
        />
      </div>

      <div style={styles.inputGroup}>
        <label style={styles.label}>📧 Follow-up After (days)</label>
        <input
          type="number"
          min="1"
          max="30"
          value={followupDays}
          onChange={(e) => setFollowupDays(parseInt(e.target.value))}
          style={styles.input}
        />
      </div>

      <div style={styles.buttonGroup}>
        <button 
          onClick={handleScheduleCampaign}
          disabled={loading}
          style={styles.scheduleBtn}
        >
          {loading ? "⏳ Scheduling..." : "🚀 Schedule Send"}
        </button>
        <button 
          onClick={handleScheduleFollowup}
          disabled={loading}
          style={{...styles.scheduleBtn, backgroundColor: "#8b5cf6"}}
        >
          {loading ? "⏳ Scheduling..." : "📧 Schedule Follow-up"}
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      
      {scheduled.length > 0 && (
        <div style={styles.scheduledList}>
          <strong style={{color: "#86efac"}}>✅ Scheduled Events:</strong>
          {scheduled.map((item, idx) => (
            <div key={idx} style={styles.scheduledItem}>
              {item.type === "campaign" ? "🚀" : "📧"} {item.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    backgroundColor: "rgba(30, 30, 30, 0.4)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "12px",
    padding: "clamp(12px, 3vw, 24px)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
  },

  title: {
    fontSize: "clamp(1rem, 2.5vw, 1.3rem)",
    fontWeight: "700",
    marginBottom: "clamp(12px, 2vw, 20px)",
    color: "#ffffff",
  },

  notice: {
    padding: "clamp(12px, 2vw, 16px)",
    backgroundColor: "rgba(249, 115, 22, 0.1)",
    border: "1px solid rgba(249, 115, 22, 0.3)",
    borderRadius: "8px",
    color: "#fed7aa",
    fontSize: "clamp(0.8rem, 1.5vw, 0.9rem)",
  },

  infoBox: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "8px",
    padding: "clamp(10px, 2vw, 14px)",
    marginBottom: "clamp(12px, 2vw, 16px)",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },

  infoPair: {
    display: "flex",
    gap: "8px",
    fontSize: "clamp(0.75rem, 1.2vw, 0.85rem)",
  },

  infoLabel: {
    color: "#94a3b8",
    fontWeight: "600",
  },

  infoValue: {
    color: "#e2e8f0",
    fontWeight: "700",
  },

  inputGroup: {
    marginBottom: "clamp(12px, 2vw, 16px)",
  },

  label: {
    display: "block",
    fontSize: "clamp(0.7rem, 1.2vw, 0.85rem)",
    fontWeight: "600",
    color: "#cbd5e1",
    marginBottom: "4px",
    textTransform: "uppercase",
  },

  input: {
    width: "100%",
    padding: "clamp(8px, 1.5vw, 10px) clamp(10px, 2vw, 12px)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "6px",
    color: "#e2e8f0",
    fontSize: "clamp(0.75rem, 1.2vw, 0.85rem)",
    boxSizing: "border-box",
  },

  buttonGroup: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
  },

  scheduleBtn: {
    padding: "clamp(8px, 1.5vw, 10px)",
    backgroundColor: "#10b981",
    border: "none",
    borderRadius: "6px",
    color: "#fff",
    fontWeight: "600",
    fontSize: "clamp(0.75rem, 1.5vw, 0.85rem)",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },

  error: {
    marginTop: "clamp(12px, 2vw, 16px)",
    padding: "clamp(8px, 1.5vw, 12px)",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    borderRadius: "6px",
    color: "#fca5a5",
    fontSize: "clamp(0.75rem, 1.2vw, 0.85rem)",
  },

  scheduledList: {
    marginTop: "clamp(12px, 2vw, 16px)",
    padding: "clamp(10px, 2vw, 12px)",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    border: "1px solid rgba(16, 185, 129, 0.3)",
    borderRadius: "6px",
    fontSize: "clamp(0.75rem, 1.2vw, 0.85rem)",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },

  scheduledItem: {
    color: "#86efac",
    fontSize: "clamp(0.7rem, 1.1vw, 0.8rem)",
    paddingLeft: "8px",
  },
}
