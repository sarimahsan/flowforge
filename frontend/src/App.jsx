import { useState, useEffect } from "react"
import {
  Mail, BarChart3, Zap, Calendar, Globe, Activity,
  CheckCircle, AlertCircle, RefreshCw, Send, TrendingUp,
  Target, Star, Database, Clock
} from "lucide-react"
import EmailManagementPanel from "./components/EmailManagementPanel"
import EmailStatusTracker from "./components/EmailStatusTracker"
// import EmailSentHistory from "./components/EmailSentHistory"
import CampaignGenerator from "./components/CampaignGenerator"
import AgentActivityLog from "./components/AgentActivityLog"
import IntelligenceCards from "./components/IntelligenceCards"
import EmailVariants from "./components/EmailVariants"
import CampaignAnalytics from "./components/CampaignAnalytics"
import CalendarScheduler from "./components/CalendarScheduler"
import LinkedInOutreach from "./components/LinkedInOutreach"
import LeadScoringDashboard from "./components/LeadScoringDashboard"
import EmailQualityReview from "./components/EmailQualityReview"
import ObjectionHandler from "./components/ObjectionHandler"
import ExportPanel from "./components/ExportPanel"
import CampaignHistory from "./components/CampaignHistory"
// import "./index.css"

const API_URL = "/api"

export default function App() {
  // Main State
  const [activeTab, setActiveTab] = useState("dashboard")
  const [loading, setLoading] = useState(false)

  // Form State
  const [company, setCompany] = useState("")
  const [goal, setGoal] = useState("")
  const [campaignId, setCampaignId] = useState(null)

  // API Response Data
  const [analysis, setAnalysis] = useState(null)
  const [emails, setEmails] = useState(null)
  const [emailTemplates, setEmailTemplates] = useState(null)
  const [followUpSchedule, setFollowUpSchedule] = useState(null)
  const [variants, setVariants] = useState(null)
  const [logs, setLogs] = useState([])
  const [analytics, setAnalytics] = useState(null)

  // Status Data
  const [gmailStatus, setGmailStatus] = useState(null)
  const [emailStats, setEmailStats] = useState(null)

  // Initialize & Poll
  useEffect(() => {
    checkGmailStatus()
    loadEmailStats()
    const interval = setInterval(loadEmailStats, 30000)
    return () => clearInterval(interval)
  }, [])

  // Check Gmail Connection
  const checkGmailStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/gmail-auth-status`)
      const data = await res.json()
      setGmailStatus(data)
    } catch (err) {
      console.error("Gmail status check failed:", err)
      setGmailStatus({ is_authenticated: false })
    }
  }

  // Load Email Stats
  const loadEmailStats = async () => {
    try {
      const res = await fetch(`${API_URL}/email-stats`)
      const data = await res.json()
      setEmailStats(data)
    } catch (err) {
      console.error("Email stats load failed:", err)
    }
  }

  // Handle Start Campaign from Lead Scoring Dashboard
  const handleStartCampaign = (companyName) => {
    setCompany(companyName)
    setGoal("") // Reset goal so user can enter it
    setActiveTab("dashboard")
    // Focus will be on the goal input after tab switch
    setTimeout(() => {
      document.querySelector('[placeholder="e.g., Launch AI training, B2B outreach..."]')?.focus()
    }, 100)
  }

  // Run Campaign Generation Agent
  const runAgent = async () => {
    if (!company.trim() || !goal.trim()) {
      alert("Please enter both company name and campaign goal")
      return
    }

    setLogs([])
    setLoading(true)

    try {
      // Step 1: Generate campaign with pipeline
      const generateResponse = await fetch(`${API_URL}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, goal })
      })

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json().catch(() => ({}))
        const errorMsg = errorData.detail || errorData.message || "Campaign generation failed"
        throw new Error(errorMsg)
      }

      const pipelineData = await generateResponse.json()
      setLogs(pipelineData.logs || [])
      setAnalysis(pipelineData.analysis || null)
      setEmails(pipelineData.emails || null)
      setEmailTemplates(pipelineData.email_templates || null)
      setFollowUpSchedule(pipelineData.follow_up_schedule || null)
      setVariants(pipelineData.variants || null)
      setAnalytics(pipelineData.analytics || null)

      // Step 2: Save campaign to database
      const saveResponse = await fetch(`${API_URL}/campaigns/create-from-pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: company,
          goal: goal,
          analysis: pipelineData.analysis || {},
          emails: pipelineData.emails || [],
          variants: pipelineData.variants || [],
          follow_up_schedule: pipelineData.follow_up_schedule || {}
        })
      })

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json().catch(() => ({}))
        console.error("Save campaign response error:", errorData)
        
        let errorMsg = "Failed to save campaign"
        if (errorData.detail) {
          errorMsg = errorData.detail
        } else if (errorData.errors) {
          errorMsg = `Validation error: ${errorData.errors.map(e => `${e.loc.join('.')}: ${e.msg}`).join(', ')}`
        } else if (errorData.message) {
          errorMsg = errorData.message
        }
        throw new Error(errorMsg)
      }

      const campaignResult = await saveResponse.json()
      setCampaignId(campaignResult.campaign_id)
      setLogs(prev => [...prev, `✅ Campaign saved (ID: ${campaignResult.campaign_id})`])
      
      setActiveTab("campaign")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error("Full campaign generation error:", err)
      console.error("Error details:", {
        message: errorMessage,
        stack: err instanceof Error ? err.stack : 'N/A',
        company,
        goal,
      })
      setLogs(prev => [...prev, `❌ Error: ${errorMessage}`])
      alert("Failed to generate campaign:\n\n" + errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Handle loading campaign from history
  const handleLoadCampaignFromHistory = (campaignData) => {
    if (!campaignData) return

    // Load all campaign data
    setCompany(campaignData.company || "")
    setGoal(campaignData.goal || "")
    setCampaignId(campaignData.campaign_id)
    
    // Load analysis
    setAnalysis(campaignData.analysis || null)
    
    // Load emails
    const emailsData = campaignData.emails || []
    if (emailsData.length > 0) {
      setEmails(emailsData)
      setEmailTemplates(emailsData)
    }
    
    // Load followups
    setFollowUpSchedule(campaignData.follow_up_schedule || null)
    
    // Load objections (map them to variants if needed)
    const objections = campaignData.objections || []
    if (objections.length > 0) {
      setVariants(objections)
    }
    
    // Add log entry
    setLogs([
      `📂 Loaded campaign: ${campaignData.company_name}`,
      `🎯 Goal: ${campaignData.goal}`,
      `📧 Emails: ${emailsData.length}`,
      `⏰ Created: ${new Date(campaignData.created_at).toLocaleDateString()}`
    ])
    
    // Switch to campaign tab to display loaded data
    setTimeout(() => {
      setActiveTab("campaign")
    }, 300)
  }

  // Tab Navigation Component
  const TabButton = ({ id, label, icon: Icon, badge }) => (
    <button
      onClick={() => {
        setActiveTab(id)
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left font-medium ${
        activeTab === id
          ? "bg-cyan-500/25 border border-cyan-400/50 text-cyan-300 shadow-lg shadow-cyan-500/10"
          : "text-slate-400 hover:text-white hover:bg-white/5 border border-slate-700/30 hover:border-slate-600/50"
      }`}
    >
      <Icon size={20} className="flex-shrink-0" />
      <span className="flex-1">{label}</span>
      {badge > 0 && (
        <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
          {badge}
        </span>
      )}
    </button>
  )

  return (
    <div className="w-full h-screen flex flex-col bg-black text-white">
      {/* Header */}
      <header className="bg-black border-b border-slate-600/30 backdrop-blur-sm h-16 flex items-center px-6 flex-shrink-0">
        <div className="flex items-center w-full">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="FlowForge AI" className="h-10 w-10 object-contain rounded-lg" />
            <div>
              <h1 className="text-lg font-bold text-white">FlowForge AI</h1>
            </div>
          </div>
          
          {/* Gmail Status and Refresh - Right Side */}
          <div className="flex items-center gap-3 ml-auto">
            {/* Gmail Status */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                gmailStatus?.is_authenticated
                  ? "bg-green-500/20 border border-green-500/30 text-green-400"
                  : "bg-red-500/20 border border-red-500/30 text-red-400"
              }`}
            >
              {gmailStatus?.is_authenticated ? (
                <>
                  <CheckCircle size={14} />
                  <span>Gmail Connected</span>
                </>
              ) : (
                <>
                  <AlertCircle size={14} />
                  <span>Gmail Offline</span>
                </>
              )}
            </div>

            {/* Refresh Button */}
            <button
              onClick={checkGmailStatus}
              title="Refresh Gmail status"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <RefreshCw size={18} className="text-slate-400 hover:text-cyan-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Content Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar Navigation */}
        <aside className="w-64 bg-black/60 border-r border-slate-600/30 backdrop-blur-md overflow-y-auto flex flex-col flex-shrink-0">
          <nav className="flex flex-col gap-2 p-4 flex-1">
            <TabButton id="dashboard" label="Dashboard" icon={Zap} />
            <TabButton id="campaign" label="Campaign" icon={Target} />
            <TabButton id="history" label="History" icon={Clock} />
            <TabButton id="leads" label="Leads" icon={Database} />
            <TabButton id="quality" label="Quality" icon={Star} />
            <TabButton id="emails" label="Emails" icon={Mail} badge={emailStats?.total_sent || 0} />
            <TabButton id="analytics" label="Analytics" icon={BarChart3} />
          </nav>
          
          {/* Sidebar Footer */}
          <div className="border-t border-slate-600/30 p-4 space-y-2">
            <p className="text-xs text-slate-400">© 2026 FlowForge AI</p>
            <p className="text-xs text-slate-500">v1.0.0</p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto flex flex-col bg-black">
          <div className="p-6 flex-1">
        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div>
              <div className="flex items-start gap-4 mb-6">
                <Zap size={28} className="text-cyan-400 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white">Campaign Generator</h2>
                  <p className="text-slate-400 mt-1">Create intelligent outreach campaigns with AI</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900/60 border border-slate-600/30 rounded-lg p-4">
                  <CampaignGenerator
                    company={company}
                    goal={goal}
                    onCompanyChange={setCompany}
                    onGoalChange={setGoal}
                    onGenerate={runAgent}
                    loading={loading}
                  />
                </div>

                {/* <div className="bg-slate-900/60 border border-slate-600/30 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-600/30">
                    <Activity size={20} className="text-cyan-400" />
                    <h3 className="text-lg font-bold text-white">Agent Activity</h3>
                  </div> */}
                  <AgentActivityLog logs={logs} loading={loading} />
                {/* </div> */}
              </div>
            </div>
          </div>
        )}

        {/* Campaign Tab */}
        {activeTab === "campaign" && (
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <Target size={28} className="text-purple-400 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white">Campaign Overview</h2>
                <p className="text-slate-400 mt-1">{company || "No Company"} — {goal || "No Goal Set"}</p>
              </div>
            </div>

            {analysis ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900/60 border border-slate-600/30 rounded-lg p-4">
                  <IntelligenceCards analysis={analysis} />
                </div>
                <div className="bg-slate-900/60 border border-slate-600/30 rounded-lg p-4">
                  <CalendarScheduler campaign={{ name: `${company} Campaign`, company, analysis }} />
                </div>

                <div className="bg-slate-900/60 border border-slate-600/30 rounded-lg p-4">
                  <LinkedInOutreach company={company} goal={goal} analysis={analysis} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Zap size={48} className="text-slate-600 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Campaign Generated Yet</h3>
                <p className="text-slate-400">Generate a campaign from the Dashboard tab to see insights</p>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="space-y-6 h-full">
            <div className="flex items-start gap-4">
              <Clock size={28} className="text-indigo-400 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white">Campaign History</h2>
                <p className="text-slate-400 mt-1">Access and restore previous campaigns</p>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-600/30 rounded-lg p-4 h-full">
              <CampaignHistory onCampaignLoaded={handleLoadCampaignFromHistory} />
            </div>
          </div>
        )}

        {/* Leads Tab */}
        {activeTab === "leads" && (
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <Database size={28} className="text-emerald-400 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white">Lead Scoring Dashboard</h2>
                <p className="text-slate-400 mt-1">View all prospects ranked by opportunity and urgency</p>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-600/30 rounded-lg p-4">
              <LeadScoringDashboard onStartCampaign={handleStartCampaign} />
            </div>
          </div>
        )}

        {/* Quality Tab */}
        {activeTab === "quality" && (
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <Star size={28} className="text-amber-400 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white">Email Quality & Preparation</h2>
                <p className="text-slate-400 mt-1">Review email scores, objections, and export intelligence</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-900/60 border border-slate-600/30 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-600/30">
                  <CheckCircle size={20} className="text-cyan-400" />
                  <h3 className="text-lg font-bold text-white">Email Quality Review</h3>
                </div>
                {campaignId ? (
                  <EmailQualityReview campaignId={campaignId} emails={emails} company={company} />
                ) : (
                  <div className="text-slate-400 text-center py-8">Generate a campaign to review email quality</div>
                )}
              </div>

              <div className="bg-slate-900/60 border border-slate-600/30 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-600/30">
                  <AlertCircle size={20} className="text-red-400" />
                  <h3 className="text-lg font-bold text-white">Objection Handler</h3>
                </div>
                {campaignId ? (
                  <ObjectionHandler campaignId={campaignId} company={company} goal={goal} analysis={analysis} />
                ) : (
                  <div className="text-slate-400 text-center py-8">Generate a campaign to see objections</div>
                )}
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-600/30 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-600/30">
                <Send size={20} className="text-purple-400" />
                <h3 className="text-lg font-bold text-white">Export Intelligence Report</h3>
              </div>
              {campaignId ? (
                <ExportPanel campaignId={campaignId} campaignData={{ company, goal, analysis, emails }} />
              ) : (
                <div className="text-slate-400 text-center py-8">Generate a campaign to enable exports</div>
              )}
            </div>
          </div>
        )}

        {/* Emails Tab */}
        {activeTab === "emails" && (
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <Mail size={28} className="text-blue-400 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white">Email Management</h2>
                <p className="text-slate-400 mt-1">Create, send, and track your campaigns</p>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-600/30 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-600/30">
                <BarChart3 size={20} className="text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Email Stats</h3>
              </div>
              {emailStats ? (
                <EmailStatusTracker stats={emailStats} />
              ) : (
                <div className="text-slate-400 text-center py-8">Loading stats...</div>
              )}
            </div>

            <div className="bg-slate-900/60 border border-slate-600/30 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-600/30">
                <Send size={20} className="text-pink-400" />
                <h3 className="text-lg font-bold text-white">Email Creator</h3>
              </div>
              {emailTemplates ? (
                <EmailManagementPanel
                  emailTemplates={emailTemplates}
                  emails={emails}
                  followUpSchedule={followUpSchedule}
                  onStatsUpdated={loadEmailStats}
                />
              ) : (
                <div className="text-slate-400 text-center py-8">No templates available</div>
              )}
            </div>

            {/* <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-700">
                <Mail size={20} className="text-purple-400" />
                <h3 className="text-lg font-bold text-white">Email History</h3>
              </div>
              {campaignId ? (
                <EmailSentHistory campaignId={campaignId} emails={emails} />
              ) : (
                <div className="text-slate-400 text-center py-8">Generate a campaign to see email history</div>
              )}
            </div> */}

            <div className="bg-slate-900/60 border border-slate-600/30 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-600/30">
                <TrendingUp size={20} className="text-orange-400" />
                <h3 className="text-lg font-bold text-white">A/B Testing</h3>
              </div>
              {variants ? (
                <EmailVariants variants={variants} emails={emails} />
              ) : (
                <div className="text-slate-400 text-center py-8">No variants available</div>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <BarChart3 size={28} className="text-yellow-400 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white">Analytics Dashboard</h2>
                <p className="text-slate-400 mt-1">Campaign performance and detailed insights</p>
              </div>
            </div>

            {campaignId ? (
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { icon: Mail, label: "Total Emails Sent", value: emailStats?.total_sent || 0, color: "bg-blue-500/20" },
                    { icon: CheckCircle, label: "Open Rate", value: emailStats?.open_rate ? `${emailStats.open_rate}%` : "N/A", color: "bg-green-500/20" },
                    { icon: TrendingUp, label: "Click Rate", value: emailStats?.click_rate ? `${emailStats.click_rate}%` : "N/A", color: "bg-purple-500/20" },
                    { icon: Target, label: "Conversion Rate", value: emailStats?.conversion_rate ? `${emailStats.conversion_rate}%` : "N/A", color: "bg-orange-500/20" },
                  ].map((stat, i) => {
                    const Icon = stat.icon
                    return (
                      <div key={i} className={`${stat.color} rounded-xl p-4 flex items-start gap-3 backdrop-blur-sm transition-all hover:shadow-lg`}>
                        <Icon size={24} className="mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-slate-300 font-medium">{stat.label}</p>
                          <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Full Campaign Analytics with Charts */}
                <div className="bg-slate-900/60 border border-slate-600/30 rounded-lg p-4">
                  <CampaignAnalytics campaignId={campaignId} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center bg-slate-900/60 border border-slate-600/30 rounded-lg">
                <BarChart3 size={48} className="text-slate-600 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Campaign Selected</h3>
                <p className="text-slate-400">Generate a campaign or load one from history to see detailed analytics and charts</p>
              </div>
            )}
          </div>
        )}
          </div>
        </main>
      </div>
    </div>
  )
}