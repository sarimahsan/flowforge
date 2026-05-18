import { useState } from "react"

const API_URL = "/api"

const departments = ["Sales", "Marketing", "Engineering", "HR", "Executive", "All"]
const tones = ["professional", "casual", "consultative"]

export default function LinkedInOutreach({ company, goal, analysis }) {
  const [selectedDepartment, setSelectedDepartment] = useState("Sales")
  const [selectedTone, setSelectedTone] = useState("professional")
  const [messages, setMessages] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedMemberIdx, setSelectedMemberIdx] = useState(null)
  const [copied, setCopied] = useState(false)

  // Extract department from analysis if available
  const analyzedDept = analysis?.department || selectedDepartment

  const handleGenerateMessages = async () => {
    if (!company || !goal) {
      setError("Please generate a campaign first")
      return
    }

    setLoading(true)
    setError("")
    setMessages([])
    setMembers([])

    try {
      console.log("Fetching LinkedIn members for:", {
        company,
        department: selectedDepartment,
        goal
      })

      const res = await fetch(`${API_URL}/linkedin/generate-messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: company,
          department: selectedDepartment === "All" ? null : selectedDepartment,
          campaign_topic: goal,
          tone: selectedTone,
          limit: 20
        })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.detail || "Failed to generate messages")
      }

      const data = await res.json()
      console.log("Response data:", data)

      if (data.messages) {
        setMessages(data.messages)
        setMembers(data.messages.map(m => m.member))
      } else {
        throw new Error("No messages generated")
      }
    } catch (err) {
      console.error("Error:", err)
      setError(err.message || "Failed to generate messages")
    } finally {
      setLoading(false)
    }
  }

  const handleCopyMessage = (message) => {
    navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const selectedMessage = messages[selectedMemberIdx]

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>💼 LinkedIn Outreach</h3>

      {!company || !goal ? (
        <div style={styles.notice}>
          📌 Generate a campaign first to unlock LinkedIn outreach
        </div>
      ) : (
        <>
          {/* Company & Goal Info */}
          <div style={styles.infoBox}>
            <div style={styles.infoPair}>
              <span style={styles.infoLabel}>Company:</span>
              <span style={styles.infoValue}>{company}</span>
            </div>
            <div style={styles.infoPair}>
              <span style={styles.infoLabel}>Goal:</span>
              <span style={styles.infoValue}>{goal}</span>
            </div>
          </div>

          {/* Filters */}
          <div style={styles.filterArea}>
            <div style={styles.filterGroup}>
              <label style={styles.label}>Department</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                style={styles.select}
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.label}>Tone</label>
              <select
                value={selectedTone}
                onChange={(e) => setSelectedTone(e.target.value)}
                style={styles.select}
              >
                {tones.map((tone) => (
                  <option key={tone} value={tone}>
                    {tone.charAt(0).toUpperCase() + tone.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleGenerateMessages}
              disabled={loading}
              style={{...styles.button, marginTop: "20px"}}
            >
              {loading ? "⏳ Generating..." : "✍️ Generate Messages"}
            </button>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          {/* Members List */}
          {members.length > 0 && (
            <>
              <div style={styles.membersHeader}>
                📋 {members.length} Members Found from {company}
              </div>
              <div style={styles.membersGrid}>
                {members.map((member, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedMemberIdx(idx)}
                    style={{
                      ...styles.memberCard,
                      backgroundColor:
                        selectedMemberIdx === idx
                          ? "rgba(59, 130, 246, 0.2)"
                          : "rgba(30, 30, 30, 0.5)",
                      borderColor:
                        selectedMemberIdx === idx
                          ? "rgba(59, 130, 246, 0.5)"
                          : "rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    <div style={styles.memberName}>{member.name}</div>
                    <div style={styles.memberTitle}>{member.title}</div>
                    {member.department && (
                      <div style={styles.memberDept}>{member.department}</div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Message Preview */}
          {selectedMessage && (
            <div style={styles.previewBox}>
              <div style={styles.previewHeader}>
                <h4 style={styles.previewTitle}>📧 Message for {members[selectedMemberIdx]?.name}</h4>
              </div>
              <div style={styles.previewContent}>
                {selectedMessage.message_draft}
              </div>
              <div style={styles.previewMeta}>
                <span style={styles.metaItem}>Tone: {selectedTone}</span>
                <span style={styles.metaItem}>Conversion: {selectedMessage.estimated_conversion}</span>
              </div>
              <button
                onClick={() => handleCopyMessage(selectedMessage.message_draft)}
                style={{...styles.button, width: "100%", marginTop: "12px"}}
              >
                {copied ? "✅ Copied!" : "📋 Copy Message"}
              </button>
            </div>
          )}

          {messages.length > 0 && (
            <div style={styles.summary}>
              <strong>✅ {messages.length} personalized messages ready</strong>
              <p>Click a member to preview their message</p>
            </div>
          )}
        </>
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
    gap: "8px",
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

  filterArea: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "clamp(8px, 2vw, 12px)",
    marginBottom: "clamp(12px, 2vw, 16px)",
    "@media (max-width: 640px)": {
      gridTemplateColumns: "1fr",
    },
  },

  filterGroup: {
    display: "flex",
    flexDirection: "column",
  },

  label: {
    fontSize: "clamp(0.7rem, 1.2vw, 0.85rem)",
    fontWeight: "600",
    color: "#cbd5e1",
    marginBottom: "4px",
    textTransform: "uppercase",
  },

  select: {
    padding: "clamp(6px, 1.5vw, 8px)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "6px",
    color: "#e2e8f0",
    fontSize: "clamp(0.75rem, 1.2vw, 0.85rem)",
  },

  button: {
    padding: "clamp(8px, 1.5vw, 10px) clamp(12px, 2vw, 16px)",
    backgroundColor: "#8b5cf6",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    fontWeight: "600",
    fontSize: "clamp(0.75rem, 1.5vw, 0.85rem)",
    cursor: "pointer",
    transition: "all 0.3s ease",
    whiteSpace: "nowrap",
  },

  membersHeader: {
    fontSize: "clamp(0.8rem, 1.5vw, 0.9rem)",
    fontWeight: "600",
    color: "#60a5fa",
    marginBottom: "8px",
    marginTop: "clamp(12px, 2vw, 16px)",
  },

  membersGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
    gap: "clamp(6px, 1vw, 10px)",
    marginBottom: "clamp(12px, 2vw, 16px)",
  },

  memberCard: {
    padding: "clamp(8px, 1.5vw, 12px)",
    backgroundColor: "rgba(30, 30, 30, 0.5)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    textAlign: "left",
  },

  memberName: {
    fontSize: "clamp(0.8rem, 1.3vw, 0.9rem)",
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: "2px",
  },

  memberTitle: {
    fontSize: "clamp(0.65rem, 1vw, 0.75rem)",
    color: "#94a3b8",
    marginBottom: "2px",
  },

  memberDept: {
    fontSize: "clamp(0.6rem, 0.9vw, 0.7rem)",
    color: "#60a5fa",
    fontWeight: "500",
  },

  previewBox: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    border: "1px solid rgba(59, 130, 246, 0.3)",
    borderRadius: "10px",
    padding: "clamp(12px, 2vw, 16px)",
    marginTop: "clamp(12px, 2vw, 16px)",
  },

  previewHeader: {
    marginBottom: "8px",
  },

  previewTitle: {
    fontSize: "clamp(0.9rem, 1.8vw, 1rem)",
    color: "#60a5fa",
    margin: 0,
  },

  previewContent: {
    fontSize: "clamp(0.75rem, 1.2vw, 0.85rem)",
    color: "#cbd5e1",
    lineHeight: "1.6",
    marginBottom: "8px",
    whiteSpace: "pre-wrap",
  },

  previewMeta: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    fontSize: "clamp(0.65rem, 1vw, 0.75rem)",
  },

  metaItem: {
    padding: "3px 6px",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: "4px",
    color: "#94a3b8",
  },

  error: {
    padding: "clamp(8px, 1.5vw, 12px)",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    borderRadius: "8px",
    color: "#fca5a5",
    fontSize: "clamp(0.75rem, 1.2vw, 0.85rem)",
    marginBottom: "clamp(12px, 2vw, 16px)",
  },

  summary: {
    padding: "clamp(8px, 1.5vw, 12px)",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    border: "1px solid rgba(16, 185, 129, 0.3)",
    borderRadius: "8px",
    color: "#86efac",
    fontSize: "clamp(0.75rem, 1.2vw, 0.85rem)",
    marginTop: "clamp(12px, 2vw, 16px)",
  },
}
