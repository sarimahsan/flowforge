import { useState, useEffect } from "react"

const API_URL = "/api"

// Email Status Icons & Colors
const EMAIL_ICONS = {
  draft: "📝",
  pending: "⏳",
  sent: "✅",
  failed: "❌",
  bounced: "⚠️",
  read: "👁️",
  clicked: "🔗"
}

const EMAIL_COLORS = {
  draft: "#9ca3af",
  pending: "#fbbf24",
  sent: "#34d399",
  failed: "#f87171",
  bounced: "#fbbf24",
  read: "#60a5fa",
  clicked: "#8b5cf6"
}

// Global styles
const applyGlobalStyles = () => {
  const style = document.createElement("style")
  style.textContent = `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body, #root {
      height: 100%;
      width: 100%;
      overflow: hidden;
    }
  `
  document.head.appendChild(style)
}

export default function App() {
  useEffect(() => {
    applyGlobalStyles()
  }, [])
  
  const [company, setCompany] = useState("")
  const [goal, setGoal] = useState("")
  const [logs, setLogs] = useState([])
  const [analysis, setAnalysis] = useState(null)
  const [emails, setEmails] = useState(null)
  const [emailTemplates, setEmailTemplates] = useState(null)
  const [followUpSchedule, setFollowUpSchedule] = useState(null)
  const [variants, setVariants] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeChannel, setActiveChannel] = useState("email")
  const [activeTab, setActiveTab] = useState("orchestrator")
  const [activeEmail, setActiveEmail] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [sendingEmail, setSendingEmail] = useState(false)
  const [recipientEmail, setRecipientEmail] = useState("")
  const [emailStats, setEmailStats] = useState(null)
  const [gmailStatus, setGmailStatus] = useState(null)
  const [sentEmails, setSentEmails] = useState([])

  // Load Gmail status on mount
  useEffect(() => {
    checkGmailStatus()
  }, [])

  const checkGmailStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/gmail-auth-status`)
      const data = await res.json()
      setGmailStatus(data)
    } catch (err) {
      console.error("Failed to check Gmail status")
    }
  }

  const loadEmailStats = async () => {
    try {
      const res = await fetch(`${API_URL}/email-stats`)
      const data = await res.json()
      setEmailStats(data)
    } catch (err) {
      console.error("Failed to load email stats")
    }
  }

  const runAgent = async () => {
    if (!company.trim() || !goal.trim()) return
    setLogs([])
    setAnalysis(null)
    setEmails(null)
    setEmailTemplates(null)
    setFollowUpSchedule(null)
    setVariants(null)
    setAnalytics(null)
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, goal })
      })
      const data = await res.json()
      setLogs(data.logs)
      setAnalysis(data.analysis)
      setEmails(data.emails)
      setEmailTemplates(data.email_templates)
      setFollowUpSchedule(data.follow_up_schedule)
      setVariants(data.variants)
      setAnalytics(data.analytics)
    } catch (err) {
      setLogs(["❌ Backend error. Is the server running?"])
    } finally {
      setLoading(false)
    }
  }

  const getAgentColor = (log) => {
    if (log.includes("Orchestrator")) return "#a78bfa"
    if (log.includes("Research")) return "#60a5fa"
    if (log.includes("Analyst")) return "#34d399"
    if (log.includes("Writer")) return "#fbbf24"
    return "#9ca3af"
  }

  const sendEmail = async (emailIndex) => {
    if (!emailTemplates || !recipientEmail.trim()) {
      alert("⚠️ Please enter recipient email first")
      return
    }

    const emailKey = `email_${emailIndex}`
    const template = emailTemplates[emailKey]
    
    if (!template) return

    setSendingEmail(true)
    try {
      const res = await fetch(`${API_URL}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_email: recipientEmail,
          subject: emails[emailKey].subject,
          html_body: template.html
        })
      })
      const data = await res.json()
      
      if (data.success) {
        setSentEmails([...sentEmails, { email: recipientEmail, status: "sent", message_id: data.message_id }])
        setLogs(prev => [...prev, `✅ Email ${emailIndex} sent to ${recipientEmail}`])
        alert(`✅ Email sent successfully to ${recipientEmail}!`)
        loadEmailStats()
      } else {
        alert(`❌ Failed: ${data.message}`)
        setLogs(prev => [...prev, `❌ Failed to send email: ${data.message}`])
      }
    } catch (err) {
      alert("❌ Error sending email")
      setLogs(prev => [...prev, `❌ Error: ${err.message}`])
    } finally {
      setSendingEmail(false)
    }
  }

  return (
    <div style={styles.appContainer}>
      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logo}>Fx</div>
          <span style={styles.logoText}>FlowForge</span>
          <p style={styles.logoSubtext}>AI OUTREACH</p>
        </div>

        <button style={styles.newCampaignBtn}>✨ New Campaign</button>

        <nav style={styles.nav}>
          {[
            { icon: "📊", label: "Dashboard" },
            { icon: "🤖", label: "AI Agents" },
            { icon: "💡", label: "Intelligence" },
            { icon: "📧", label: "Outreach" },
            { icon: "📈", label: "Analytics" }
          ].map(item => (
            <div key={item.label} style={styles.navItem}>
              <span style={styles.navIcon}>{item.icon}</span>
              <span style={styles.navLabel}>{item.label}</span>
            </div>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          {[
            { icon: "⚙️", label: "Settings" },
            { icon: "❓", label: "Support" }
          ].map(item => (
            <div key={item.label} style={styles.navItem}>
              <span style={styles.navIcon}>{item.icon}</span>
              <span style={styles.navLabel}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={styles.mainContainer}>
        {/* TOP BAR */}
        <div style={styles.topBar}>
          <input
            placeholder="Search leads or campaigns..."
            style={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div style={styles.channelSelector}>
            {[
              { id: "email", label: "Email" },
              { id: "linkedin", label: "LinkedIn" },
              { id: "sms", label: "SMS" }
            ].map(ch => (
              <button
                key={ch.id}
                style={activeChannel === ch.id ? styles.channelBtnActive : styles.channelBtn}
                onClick={() => setActiveChannel(ch.id)}
              >
                {ch.label}
              </button>
            ))}
          </div>

          <div style={styles.topBarRight}>
            <div style={styles.statusBadge}>🟢 GLOBAL STATUS: ACTIVE</div>
            <div style={styles.topIcon}>🔔</div>
            <div style={styles.topIcon}>⚡</div>
            <div style={styles.userAvatar}>👤</div>
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div style={styles.contentArea}>
          <div style={styles.gridContainer}>
            {/* LEFT COLUMN */}
            <div style={styles.leftColumn}>
              <div style={styles.campaignCard}>
                <h2 style={styles.cardTitle}>Campaign Generator</h2>
                
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>COMPANY NAME</label>
                  <input
                    style={styles.formInput}
                    placeholder="e.g Acme Corp"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>OUTREACH GOAL</label>
                  <textarea
                    style={styles.formTextarea}
                    placeholder="Define your intent..."
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                  />
                </div>

                <button
                  style={loading ? styles.generateBtnDisabled : styles.generateBtn}
                  onClick={runAgent}
                  disabled={loading}
                >
                  {loading ? "⏳ GENERATING..." : "GENERATE ✨"}
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div style={styles.rightColumn}>
              <div style={styles.agentActivityCard}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle2}>Agent Activity (Live Logs)</h3>
                  <div style={styles.logTabs}>
                    {["ORCHESTRATOR", "RESEARCH", "ANALYST", "WRITER"].map(tab => (
                      <button
                        key={tab}
                        style={activeTab === tab.toLowerCase() ? styles.logTabActive : styles.logTab}
                        onClick={() => setActiveTab(tab.toLowerCase())}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={styles.logsContainer}>
                  {logs.length === 0 ? (
                    <p style={styles.emptyLogs}>Waiting for agent logs...</p>
                  ) : (
                    logs.map((log, i) => (
                      <div key={i} style={styles.logEntry}>
                        <span style={{...styles.logTime, color: getAgentColor(log)}}>
                          [{new Date().toLocaleTimeString()}]
                        </span>
                        <span style={{color: getAgentColor(log)}}>{log}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* INTELLIGENCE GRID */}
          {analysis && (
            <div style={styles.intelligenceSection}>
              <h3 style={styles.sectionTitle}>Intelligence Cards</h3>
              <div style={styles.intelligenceGrid}>
                <div style={styles.intelligenceCard}>
                  <div style={styles.cardIcon}>🎯</div>
                  <h4 style={styles.cardSubtitle}>Opportunity ID</h4>
                  <p style={styles.cardContent}>{analysis.opportunity}</p>
                </div>

                <div style={styles.intelligenceCard}>
                  <div style={styles.cardIcon}>👤</div>
                  <h4 style={styles.cardSubtitle}>Decision Maker</h4>
                  <p style={styles.cardContent}>{analysis.decision_maker}</p>
                </div>

                <div style={styles.intelligenceCard}>
                  <div style={styles.cardIcon}>📌</div>
                  <h4 style={styles.cardSubtitle}>Key Facts</h4>
                  <p style={styles.cardContent}>{analysis.key_fact}</p>
                </div>

                <div style={styles.intelligenceCard}>
                  <div style={styles.cardIcon}>⚠️</div>
                  <h4 style={styles.cardSubtitle}>Pain Points</h4>
                  <p style={styles.cardContent}>{analysis.pain_points?.join(", ")}</p>
                </div>
              </div>
            </div>
          )}

          {/* MULTI-CHANNEL SECTION */}
          {variants && emails && (
            <div style={styles.multiChannelSection}>
              <h3 style={styles.sectionTitle}>Email Channel</h3>

              <div style={styles.emailVariantsGrid}>
                <div style={styles.emailVariantCard}>
                  <div style={styles.variantBadgeA}>VARIANT A / DIRECT</div>
                  <p style={styles.emailSubject}>Subject: {variants.ab_variants.subject_a}</p>
                  <p style={styles.emailPreview}>{emails.email_1?.body?.substring(0, 150)}...</p>
                  <div style={styles.variantFooter}>
                    <span style={styles.toneLabel}>Tone: {variants.ab_variants.tone_a}</span>
                    <span style={styles.confidenceScore}>CONFIDENCE 84%</span>
                  </div>
                </div>

                <div style={styles.emailVariantCard}>
                  <div style={styles.variantBadgeB}>VARIANT B / INSIGHTFUL</div>
                  <p style={styles.emailSubject}>Subject: {variants.ab_variants.subject_b}</p>
                  <p style={styles.emailPreview}>{emails.email_2?.body?.substring(0, 150)}...</p>
                  <div style={styles.variantFooter}>
                    <span style={styles.toneLabel}>Tone: {variants.ab_variants.tone_b}</span>
                    <span style={styles.confidenceScore}>CONFIDENCE 89%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* EMAIL TEMPLATES & SENDING */}
          {emailTemplates && (
            <div style={styles.emailTemplateSection}>
              <h3 style={styles.sectionTitle}>Professional Email Templates</h3>
              
              <div style={styles.emailSenderSetup}>
                <input
                  type="email"
                  placeholder="Recipient email address..."
                  style={styles.emailInput}
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                />
              </div>

              <div style={styles.emailTabsContainer}>
                {[1, 2, 3].map(num => (
                  <button
                    key={num}
                    style={activeEmail === num ? styles.emailTabActive : styles.emailTab}
                    onClick={() => setActiveEmail(num)}
                  >
                    Email {num}
                    {followUpSchedule?.[`email_${num}`]?.status === "sent" && " ✅"}
                    {followUpSchedule?.[`email_${num}`]?.status === "pending" && " ⏳"}
                  </button>
                ))}
              </div>

              <div style={styles.emailTemplateCard}>
                {emails?.[`email_${activeEmail}`] && (
                  <>
                    <div style={styles.emailMeta}>
                      <div>
                        <h4 style={{color: "#a78bfa", marginBottom: "4px"}}>Subject</h4>
                        <p style={{fontSize: "0.95rem", color: "#cbd5e1"}}>{emails[`email_${activeEmail}`].subject}</p>
                      </div>
                      {followUpSchedule?.[`email_${activeEmail}`] && (
                        <div>
                          <h4 style={{color: "#a78bfa", marginBottom: "4px"}}>Schedule</h4>
                          <p style={{fontSize: "0.9rem", color: "#64748b"}}>Day {followUpSchedule[`email_${activeEmail}`].day}</p>
                        </div>
                      )}
                    </div>

                    <div style={styles.emailPreviewHTML}>
                      <div dangerouslySetInnerHTML={{__html: emailTemplates[`email_${activeEmail}`].html}} />
                    </div>

                    <button
                      style={sendingEmail ? styles.sendBtnDisabled : styles.sendBtn}
                      onClick={() => sendEmail(activeEmail)}
                      disabled={sendingEmail}
                    >
                      {sendingEmail ? "⏳ Sending..." : "📤 Send via Gmail"}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ANALYTICS DASHBOARD */}
          {analytics && (
            <div style={styles.analyticsSection}>
              <h3 style={styles.sectionTitle}>Campaign Analytics</h3>
              
              <div style={styles.metricsGrid}>
                <div style={styles.metricTile}>
                  <div style={styles.metricNumber}>{analytics.total_emails} / 3</div>
                  <div style={styles.metricLabel}>TOTAL EMAILS</div>
                </div>

                <div style={styles.metricTile}>
                  <div style={styles.metricNumber}>{analytics.channels.length}</div>
                  <div style={styles.metricLabel}>CHANNELS</div>
                </div>

                <div style={styles.metricTile}>
                  <div style={styles.metricNumber}>{analytics.estimated_reach}</div>
                  <div style={styles.metricLabel}>EST. REACH</div>
                </div>

                <div style={styles.metricTile}>
                  <div style={styles.metricNumber}>{analytics.optimization_score}%</div>
                  <div style={styles.metricLabel}>OPT. SCORE</div>
                </div>

                <div style={styles.metricTile}>
                  <div style={styles.metricNumber}>{analytics.best_channel}</div>
                  <div style={styles.metricLabel}>BEST CHANNEL</div>
                </div>

                <div style={styles.metricTile}>
                  <div style={styles.metricNumber}>{analytics.peak_send_time}</div>
                  <div style={styles.metricLabel}>PEAK TIME</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  appContainer: {
    display: "flex",
    height: "100vh",
    backgroundColor: "#0f172a",
    color: "#e2e8f0",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    overflow: "hidden",
  },

  sidebar: {
    width: "160px",
    backgroundColor: "#0a0f1f",
    borderRight: "1px solid #1e293b",
    padding: "20px 0",
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    height: "100vh",
    flexShrink: 0,
  },
  sidebarHeader: {
    padding: "0 15px 30px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    borderBottom: "1px solid #1e293b",
    marginBottom: "20px",
  },
  logo: {
    width: "40px",
    height: "40px",
    borderRadius: "8px",
    background: "linear-gradient(135deg, #a78bfa, #60a5fa)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "800",
    fontSize: "1.2rem",
    marginBottom: "8px",
  },
  logoText: {
    fontWeight: "700",
    fontSize: "0.95rem",
  },
  logoSubtext: {
    fontSize: "0.65rem",
    color: "#64748b",
    margin: "4px 0 0 0",
    letterSpacing: "0.1em",
  },
  newCampaignBtn: {
    margin: "0 12px 25px",
    padding: "10px",
    background: "linear-gradient(135deg, #c084fc, #a78bfa)",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    fontWeight: "700",
    fontSize: "0.85rem",
    cursor: "pointer",
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    flex: 1,
    padding: "0 10px",
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.85rem",
    color: "#94a3b8",
  },
  navIcon: {
    fontSize: "1.2rem",
  },
  navLabel: {
    fontWeight: "500",
  },
  sidebarFooter: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "20px 10px 0",
    borderTop: "1px solid #1e293b",
  },

  mainContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    overflow: "hidden",
  },

  topBar: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    padding: "16px 24px",
    backgroundColor: "#0f172a",
    borderBottom: "1px solid #1e293b",
    flexShrink: 0,
  },
  searchInput: {
    flex: "0.3",
    backgroundColor: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "8px",
    padding: "9px 14px",
    color: "#e2e8f0",
    fontSize: "0.9rem",
    outline: "none",
  },
  channelSelector: {
    display: "flex",
    gap: "4px",
  },
  channelBtn: {
    padding: "6px 16px",
    backgroundColor: "transparent",
    border: "1px solid #334155",
    borderRadius: "6px",
    color: "#94a3b8",
    fontSize: "0.9rem",
    cursor: "pointer",
    fontWeight: "500",
  },
  channelBtnActive: {
    padding: "6px 16px",
    backgroundColor: "#1e293b",
    border: "1px solid #a78bfa",
    borderRadius: "6px",
    color: "#a78bfa",
    fontSize: "0.9rem",
    cursor: "pointer",
    fontWeight: "500",
  },
  topBarRight: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginLeft: "auto",
  },
  statusBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 12px",
    backgroundColor: "#1e293b",
    border: "1px solid #059669",
    borderRadius: "6px",
    fontSize: "0.75rem",
    fontWeight: "700",
    color: "#10b981",
  },
  topIcon: {
    fontSize: "1.2rem",
    cursor: "pointer",
  },
  userAvatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    backgroundColor: "#1e293b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1rem",
  },

  contentArea: {
    flex: 1,
    padding: "24px",
    overflowY: "auto",
    overflowX: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  gridContainer: {
    display: "grid",
    gridTemplateColumns: "1fr 2fr",
    gap: "24px",
    marginBottom: "24px",
    minHeight: "400px",
  },

  campaignCard: {
    backgroundColor: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "12px",
    padding: "24px",
    height: "100%",
    display: "flex",
    flexDirection: "column",
  },
  cardTitle: {
    fontSize: "1.2rem",
    fontWeight: "700",
    marginBottom: "20px",
    color: "#e2e8f0",
  },
  formGroup: {
    marginBottom: "20px",
    flex: 1,
  },
  formLabel: {
    display: "block",
    fontSize: "0.75rem",
    fontWeight: "700",
    color: "#94a3b8",
    marginBottom: "8px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  formInput: {
    width: "100%",
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "#e2e8f0",
    fontSize: "0.95rem",
    outline: "none",
    boxSizing: "border-box",
  },
  formTextarea: {
    width: "100%",
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "#e2e8f0",
    fontSize: "0.95rem",
    outline: "none",
    boxSizing: "border-box",
    minHeight: "100px",
    fontFamily: "inherit",
    resize: "vertical",
  },
  generateBtn: {
    width: "100%",
    padding: "12px",
    background: "linear-gradient(135deg, #c084fc, #a78bfa)",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    fontWeight: "700",
    fontSize: "0.95rem",
    cursor: "pointer",
    marginTop: "10px",
  },
  generateBtnDisabled: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#334155",
    border: "none",
    borderRadius: "8px",
    color: "#64748b",
    fontWeight: "700",
    fontSize: "0.95rem",
    cursor: "not-allowed",
    marginTop: "10px",
  },

  agentActivityCard: {
    backgroundColor: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "12px",
    padding: "24px",
    height: "100%",
    display: "flex",
    flexDirection: "column",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    flexShrink: 0,
  },
  cardTitle2: {
    fontSize: "1.1rem",
    fontWeight: "700",
    color: "#e2e8f0",
  },
  logTabs: {
    display: "flex",
    gap: "8px",
  },
  logTab: {
    padding: "4px 10px",
    backgroundColor: "transparent",
    border: "1px solid #334155",
    borderRadius: "4px",
    color: "#94a3b8",
    fontSize: "0.7rem",
    fontWeight: "700",
    cursor: "pointer",
    textTransform: "uppercase",
  },
  logTabActive: {
    padding: "4px 10px",
    backgroundColor: "#334155",
    border: "1px solid #60a5fa",
    borderRadius: "4px",
    color: "#60a5fa",
    fontSize: "0.7rem",
    fontWeight: "700",
    cursor: "pointer",
    textTransform: "uppercase",
  },
  logsContainer: {
    flex: 1,
    overflowY: "auto",
    backgroundColor: "#0f172a",
    borderRadius: "8px",
    padding: "14px",
  },
  logEntry: {
    fontSize: "0.85rem",
    lineHeight: "1.6",
    marginBottom: "8px",
    fontFamily: "monospace",
    display: "flex",
    gap: "8px",
  },
  logTime: {
    color: "#64748b",
    minWidth: "100px",
  },
  emptyLogs: {
    color: "#64748b",
    textAlign: "center",
    padding: "20px",
    fontSize: "0.9rem",
  },

  intelligenceSection: {
    marginBottom: "24px",
  },
  sectionTitle: {
    fontSize: "1.1rem",
    fontWeight: "700",
    marginBottom: "16px",
    color: "#e2e8f0",
  },
  intelligenceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
  },
  intelligenceCard: {
    backgroundColor: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "12px",
    padding: "20px",
    textAlign: "center",
  },
  cardIcon: {
    fontSize: "2rem",
    marginBottom: "12px",
  },
  cardSubtitle: {
    fontSize: "0.75rem",
    fontWeight: "700",
    color: "#94a3b8",
    marginBottom: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  cardContent: {
    fontSize: "0.95rem",
    color: "#cbd5e1",
    lineHeight: "1.5",
  },

  multiChannelSection: {
    marginBottom: "24px",
  },
  emailVariantsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  emailVariantCard: {
    backgroundColor: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "12px",
    padding: "20px",
  },
  variantBadgeA: {
    display: "inline-block",
    padding: "4px 10px",
    backgroundColor: "#c084fc",
    color: "#fff",
    fontSize: "0.7rem",
    fontWeight: "700",
    borderRadius: "4px",
    marginBottom: "12px",
  },
  variantBadgeB: {
    display: "inline-block",
    padding: "4px 10px",
    backgroundColor: "#60a5fa",
    color: "#fff",
    fontSize: "0.7rem",
    fontWeight: "700",
    borderRadius: "4px",
    marginBottom: "12px",
  },
  emailSubject: {
    fontSize: "0.95rem",
    fontWeight: "600",
    color: "#cbd5e1",
    marginBottom: "12px",
  },
  emailPreview: {
    fontSize: "0.85rem",
    color: "#94a3b8",
    lineHeight: "1.5",
    marginBottom: "12px",
  },
  variantFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: "12px",
    borderTop: "1px solid #334155",
  },
  toneLabel: {
    fontSize: "0.8rem",
    color: "#64748b",
  },
  confidenceScore: {
    fontSize: "0.8rem",
    fontWeight: "700",
    color: "#10b981",
  },

  analyticsSection: {
    marginBottom: "24px",
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(6, 1fr)",
    gap: "12px",
  },
  metricTile: {
    backgroundColor: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "12px",
    padding: "18px",
    textAlign: "center",
  },
  metricNumber: {
    fontSize: "1.8rem",
    fontWeight: "800",
    background: "linear-gradient(135deg, #c084fc, #60a5fa)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    marginBottom: "8px",
  },
  metricLabel: {
    fontSize: "0.75rem",
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },

  emailTemplateSection: {
    marginBottom: "24px",
  },
  emailSenderSetup: {
    marginBottom: "16px",
  },
  emailInput: {
    width: "100%",
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "#e2e8f0",
    fontSize: "0.95rem",
    outline: "none",
    boxSizing: "border-box",
  },
  emailTabsContainer: {
    display: "flex",
    gap: "8px",
    marginBottom: "16px",
  },
  emailTab: {
    padding: "8px 14px",
    backgroundColor: "transparent",
    border: "1px solid #334155",
    borderRadius: "6px",
    color: "#94a3b8",
    fontSize: "0.9rem",
    cursor: "pointer",
    fontWeight: "500",
    transition: "all 0.2s",
  },
  emailTabActive: {
    padding: "8px 14px",
    backgroundColor: "#1e293b",
    border: "1px solid #a78bfa",
    borderRadius: "6px",
    color: "#a78bfa",
    fontSize: "0.9rem",
    cursor: "pointer",
    fontWeight: "600",
  },
  emailTemplateCard: {
    backgroundColor: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "12px",
    padding: "24px",
  },
  emailMeta: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "24px",
    marginBottom: "20px",
    paddingBottom: "20px",
    borderBottom: "1px solid #334155",
  },
  emailPreviewHTML: {
    backgroundColor: "#0f172a",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "16px",
    minHeight: "300px",
    maxHeight: "400px",
    overflowY: "auto",
    fontSize: "0.9rem",
    color: "#cbd5e1",
    lineHeight: "1.6",
  },
  sendBtn: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#a78bfa",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    fontWeight: "700",
    fontSize: "0.95rem",
    cursor: "pointer",
  },
  sendBtnDisabled: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#334155",
    border: "none",
    borderRadius: "8px",
    color: "#64748b",
    fontWeight: "700",
    fontSize: "0.95rem",
    cursor: "not-allowed",
  },
}
