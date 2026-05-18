import { useState } from "react"

const API_URL = "/api"

export default function EmailManagementPanel({ emailTemplates, emails, followUpSchedule, onStatsUpdated }) {
  const [activeEmail, setActiveEmail] = useState(1)
  const [recipientEmail, setRecipientEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [sentEmails, setSentEmails] = useState([])

  const sendEmail = async (emailIndex) => {
    if (!recipientEmail.trim()) {
      alert("⚠️ Please enter recipient email")
      return
    }

    const emailKey = `email_${emailIndex}`
    if (!emailTemplates[emailKey]) {
      alert("❌ Email template not found")
      return
    }

    setSending(true)
    try {
      const res = await fetch(`${API_URL}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_email: recipientEmail,
          subject: emails[emailKey].subject,
          html_body: emailTemplates[emailKey].html
        })
      })

      const data = await res.json()

      if (data.success) {
        setSentEmails([...sentEmails, {
          email: recipientEmail,
          status: "sent",
          time: new Date().toLocaleTimeString()
        }])
        alert(`✅ Email sent to ${recipientEmail}`)
        onStatsUpdated?.()
      } else {
        alert(`❌ Failed: ${data.message}`)
      }
    } catch (err) {
      alert("❌ Error sending email: " + err.message)
    } finally {
      setSending(false)
    }
  }

  const currentEmailKey = `email_${activeEmail}`
  const currentEmail = emails?.[currentEmailKey]
  const currentTemplate = emailTemplates?.[currentEmailKey]

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>📧 Email Management & Sending</h2>
        <span style={styles.subtitle}>Professional Email Templates with Tracking</span>
      </div>

      {/* Recipient Input */}
      <div style={styles.recipientBox}>
        <label style={styles.label}>👤 Recipient Email Address</label>
        <input
          type="email"
          placeholder="recipient@company.com"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
          style={styles.emailInput}
        />
      </div>

      {/* Email Tabs */}
      <div style={styles.tabsContainer}>
        {[1, 2, 3].map(num => {
          const key = `email_${num}`
          const status = followUpSchedule?.[key]?.status
          const icon = status === "sent" ? "✅" : status === "pending" ? "⏳" : "📝"
          return (
            <button
              key={num}
              onClick={() => setActiveEmail(num)}
              style={{
                ...styles.tab,
                ...(activeEmail === num ? styles.tabActive : {})
              }}
            >
              <span style={styles.tabIcon}>{icon}</span>
              Email {num}
            </button>
          )
        })}
      </div>

      {/* Email Preview */}
      {currentEmail && currentTemplate && (
        <div style={styles.emailContent}>
          {/* Metadata */}
          <div style={styles.metadataBox}>
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>📌 Subject:</span>
              <span style={styles.metaValue}>{currentEmail.subject}</span>
            </div>
            {followUpSchedule?.[currentEmailKey] && (
              <div style={styles.metaItem}>
                <span style={styles.metaLabel}>📅 Schedule:</span>
                <span style={styles.metaValue}>Day {followUpSchedule[currentEmailKey].day}</span>
              </div>
            )}
          </div>

          {/* HTML Preview */}
          <div style={styles.previewBox}>
            <div style={styles.previewLabel}>📝 Email Preview:</div>
            <div
              style={styles.htmlPreview}
              dangerouslySetInnerHTML={{ __html: currentTemplate.html }}
            />
          </div>

          {/* Send Button */}
          <button
            onClick={() => sendEmail(activeEmail)}
            disabled={sending}
            style={{
              ...styles.sendBtn,
              ...(sending ? styles.sendBtnDisabled : {})
            }}
          >
            {sending ? "⏳ Sending..." : "📤 Send Email"}
          </button>
        </div>
      )}

      {/* Sent Emails History */}
      {sentEmails.length > 0 && (
        <div style={styles.historyBox}>
          <h3 style={styles.historyTitle}>📬 Sent Emails ({sentEmails.length})</h3>
          <div style={styles.historyList}>
            {sentEmails.map((item, idx) => (
              <div key={idx} style={styles.historyItem}>
                <span style={styles.historyIcon}>✅</span>
                <div style={styles.historyContent}>
                  <div style={styles.historyEmail}>{item.email}</div>
                  <div style={styles.historyTime}>{item.time}</div>
                </div>
              </div>
            ))}
          </div>
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

  header: {
    marginBottom: "clamp(12px, 2vw, 24px)",
    paddingBottom: "clamp(8px, 1.5vw, 16px)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
  },

  title: {
    fontSize: "clamp(1rem, 2.5vw, 1.3rem)",
    fontWeight: "700",
    color: "#ffffff",
    margin: "0 0 clamp(2px, 0.5vw, 4px) 0",
  },

  subtitle: {
    fontSize: "clamp(0.8rem, 1.5vw, 0.9rem)",
    color: "#a0a0a0",
  },

  recipientBox: {
    marginBottom: "clamp(12px, 2vw, 20px)",
  },

  label: {
    display: "block",
    fontSize: "clamp(0.7rem, 1.2vw, 0.85rem)",
    fontWeight: "600",
    color: "#cbd5e1",
    marginBottom: "clamp(4px, 1vw, 8px)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },

  emailInput: {
    width: "100%",
    padding: "clamp(8px, 1.5vw, 12px) clamp(10px, 2vw, 16px)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "8px",
    color: "#e2e8f0",
    fontSize: "clamp(0.8rem, 1.5vw, 0.95rem)",
    outline: "none",
    boxSizing: "border-box",
    backdropFilter: "blur(5px)",
  },

  tabsContainer: {
    display: "flex",
    gap: "clamp(4px, 1vw, 8px)",
    marginBottom: "clamp(12px, 2vw, 20px)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    paddingBottom: "clamp(8px, 1.5vw, 12px)",
    flexWrap: "wrap",
    overflowX: "auto",
  },

  tab: {
    padding: "clamp(6px, 1vw, 10px) clamp(10px, 1.5vw, 16px)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "6px",
    color: "#a0a0a0",
    fontSize: "clamp(0.75rem, 1.2vw, 0.9rem)",
    fontWeight: "500",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "clamp(4px, 1vw, 6px)",
    backdropFilter: "blur(5px)",
    transition: "all 0.3s ease",
    whiteSpace: "nowrap",
  },

  tabActive: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderColor: "rgba(255, 255, 255, 0.2)",
    color: "#ffffff",
  },

  tabIcon: {
    fontSize: "1rem",
  },

  emailContent: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },

  metadataBox: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "8px",
    padding: "16px",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
    backdropFilter: "blur(5px)",
  },

  metaItem: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },

  metaLabel: {
    fontSize: "0.8rem",
    fontWeight: "600",
    color: "#ffffff",
    textTransform: "uppercase",
  },

  metaValue: {
    fontSize: "0.95rem",
    color: "#cbd5e1",
  },

  previewBox: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "8px",
    padding: "16px",
    backdropFilter: "blur(5px)",
  },

  previewLabel: {
    fontSize: "0.85rem",
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: "12px",
    textTransform: "uppercase",
  },

  htmlPreview: {
    backgroundColor: "#ffffff",
    color: "#000",
    borderRadius: "6px",
    padding: "16px",
    minHeight: "200px",
    maxHeight: "400px",
    overflowY: "auto",
    fontSize: "0.9rem",
    lineHeight: "1.6",
  },

  sendBtn: {
    padding: "12px 24px",
    backgroundColor: "#10b981",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    fontWeight: "600",
    fontSize: "0.95rem",
    cursor: "pointer",
    backdropFilter: "blur(5px)",
    transition: "all 0.3s ease",
  },

  sendBtnDisabled: {
    backgroundColor: "#666",
    color: "#999",
    cursor: "not-allowed",
  },

  historyBox: {
    marginTop: "24px",
    paddingTop: "20px",
    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
  },

  historyTitle: {
    fontSize: "0.95rem",
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: "12px",
  },

  historyList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  historyItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 12px",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: "6px",
    backdropFilter: "blur(5px)",
  },

  historyIcon: {
    fontSize: "1.2rem",
  },

  historyContent: {
    flex: 1,
  },

  historyEmail: {
    fontSize: "0.9rem",
    color: "#cbd5e1",
    fontWeight: "500",
  },

  historyTime: {
    fontSize: "0.8rem",
    color: "#64748b",
  },
}
