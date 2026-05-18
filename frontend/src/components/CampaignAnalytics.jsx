import { useState, useEffect } from 'react'
import { TrendingUp, Mail, CheckCircle2, AlertCircle, Zap, Award, BarChart3, Clock, Globe } from 'lucide-react'
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

const API_URL = '/api'

export default function CampaignAnalytics({ campaignId }) {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAnalytics = async () => {
    try {
      console.log(`📊 Fetching analytics for campaign: ${campaignId}`)
      setLoading(true)
      const url = `${API_URL}/campaigns/${campaignId}/analytics`
      console.log(`📍 API URL: ${url}`)
      
      const response = await fetch(url)
      console.log(`📡 Response status: ${response.status}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ API Error (${response.status}):`, errorText)
        throw new Error(`Failed to fetch analytics: ${response.status} ${errorText}`)
      }
      
      const data = await response.json()
      console.log(`✅ Analytics data received:`, data)
      setAnalytics(data)
      setError(null)
    } catch (err) {
      console.error(`❌ Error in fetchAnalytics:`, err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log(`🔄 CampaignAnalytics useEffect triggered, campaignId: ${campaignId}`)
    if (campaignId) {
      console.log(`✅ Campaign ID exists, fetching analytics...`)
      fetchAnalytics()
    } else {
      console.warn(`⚠️ Campaign ID is missing or falsy`)
      setAnalytics(null)
      setLoading(false)
    }
  }, [campaignId])

  if (loading) {
    return (
      <div className="h-64 bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-slate-700/50 rounded-lg flex flex-col items-center justify-center gap-4">
        <div className="animate-spin">
          <BarChart3 size={32} className="text-cyan-400" />
        </div>
        <div className="text-center">
          <p className="text-slate-400">Loading analytics...</p>
          <p className="text-xs text-slate-500 mt-2">Campaign ID: {campaignId}</p>
          <p className="text-xs text-slate-500">API: {API_URL}</p>
        </div>
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <div className="h-64 bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-red-700/50 rounded-lg flex flex-col items-center justify-center gap-4 p-6">
        <AlertCircle size={32} className="text-red-400" />
        <div className="text-center">
          <p className="text-red-400 font-semibold">Error Loading Analytics</p>
          <p className="text-sm text-slate-300 mt-2">{error || 'No analytics available'}</p>
          <details className="mt-3 text-left">
            <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-300">Debug Info</summary>
            <div className="mt-2 text-xs text-slate-500 bg-slate-900/50 p-2 rounded font-mono">
              <p>Campaign ID: {campaignId}</p>
              <p>API URL: {API_URL}/campaigns/{campaignId}/analytics</p>
            </div>
          </details>
          <button
            onClick={fetchAnalytics}
            className="mt-3 px-3 py-1 bg-red-500/20 border border-red-500/30 text-red-400 rounded text-xs hover:bg-red-500/30 transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const { emails, quality_distribution, objections, followups, opportunity, health_score, company, performance, funnel, email_types, email_performance, summary } = analytics

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="text-cyan-400" />
            Campaign Analytics
          </h2>
          <p className="text-sm text-slate-400 mt-1">{analytics.campaign_name}</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all text-sm font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Health Score Card */}
      <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 rounded-lg p-6 hover:border-slate-600/50 transition-all">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Award className="text-amber-400" size={24} />
            <div>
              <h3 className="text-lg font-bold text-white">Campaign Health</h3>
              <p className="text-xs text-slate-400">Overall quality score</p>
            </div>
          </div>
          <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
            {health_score}%
          </div>
        </div>
        <div className="w-full bg-slate-700/30 rounded-full h-3 overflow-hidden border border-slate-600/30">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out ${
              health_score >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
              health_score >= 60 ? 'bg-gradient-to-r from-amber-500 to-orange-400' :
              'bg-gradient-to-r from-red-500 to-rose-400'
            }`}
            style={{ width: `${health_score}%` }}
          />
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Emails */}
        <MetricCard
          icon={<Mail className="text-blue-400" size={24} />}
          label="Total Emails"
          value={emails.total}
          subtext="in sequence"
          gradient="from-blue-600 to-blue-400"
        />

        {/* Sent Emails */}
        <MetricCard
          icon={<CheckCircle2 className="text-green-400" size={24} />}
          label="Sent"
          value={emails.sent}
          subtext={`${emails.drafted} drafts remaining`}
          gradient="from-green-600 to-emerald-400"
        />

        {/* Open Rate */}
        <MetricCard
          icon={<TrendingUp className="text-purple-400" size={24} />}
          label="Open Rate"
          value={`${emails.open_rate}%`}
          subtext={`${emails.opened} emails opened`}
          gradient="from-purple-600 to-purple-400"
        />

        {/* Objections Covered */}
        <MetricCard
          icon={<AlertCircle className="text-orange-400" size={24} />}
          label="Objections"
          value={objections.total}
          subtext={`${objections.covered_percentage.toFixed(0)}% coverage`}
          gradient="from-orange-600 to-orange-400"
        />
      </div>

      {/* Quality Distribution & Confidence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quality Distribution */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-indigo-400" />
            Email Quality Distribution
          </h3>
          <div className="space-y-4">
            {Object.entries(quality_distribution).map(([quality, count]) => (
              <div key={quality}>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-slate-300 capitalize">{quality}</span>
                  <span className="text-sm font-bold text-slate-300">
                    {count} <span className="text-xs text-slate-500">/ {emails.total}</span>
                  </span>
                </div>
                <div className="w-full bg-slate-700/30 rounded-full h-2.5 overflow-hidden border border-slate-600/30">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      quality === 'excellent' ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                      quality === 'good' ? 'bg-gradient-to-r from-blue-500 to-cyan-400' :
                      quality === 'fair' ? 'bg-gradient-to-r from-amber-500 to-orange-400' :
                      'bg-gradient-to-r from-red-500 to-rose-400'
                    }`}
                    style={{ width: `${(count / emails.total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Quality Distribution Pie Chart */}
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={Object.entries(quality_distribution).map(([name, value]) => ({
                    name: name.charAt(0).toUpperCase() + name.slice(1),
                    value: value
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#0ea5e9" />
                  <Cell fill="#f59e0b" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Confidence & Personalization */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Zap size={20} className="text-yellow-400" />
            Quality Metrics
          </h3>
          <div className="space-y-6">
            {/* Confidence Score */}
            <div>
              <div className="flex justify-between mb-3">
                <span className="text-sm font-medium text-slate-300">Avg Confidence</span>
                <span className="text-lg font-bold text-cyan-400">{emails.avg_confidence_score.toFixed(1)}/100</span>
              </div>
              <div className="w-full bg-slate-700/30 rounded-full h-3 overflow-hidden border border-slate-600/30">
                <div
                  className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-cyan-500 to-blue-400"
                  style={{ width: `${emails.avg_confidence_score}%` }}
                />
              </div>
            </div>

            {/* Personalization Score */}
            <div>
              <div className="flex justify-between mb-3">
                <span className="text-sm font-medium text-slate-300">Avg Personalization</span>
                <span className="text-lg font-bold text-pink-400">{emails.avg_personalization_score.toFixed(1)}/100</span>
              </div>
              <div className="w-full bg-slate-700/30 rounded-full h-3 overflow-hidden border border-slate-600/30">
                <div
                  className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-pink-500 to-rose-400"
                  style={{ width: `${emails.avg_personalization_score}%` }}
                />
              </div>
            </div>
          </div>

          {/* Score Comparison Bar Chart */}
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                {
                  name: 'Email Scores',
                  'Confidence': emails.avg_confidence_score,
                  'Personalization': emails.avg_personalization_score,
                  'Open Rate': emails.open_rate
                }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="name" stroke="#999" />
                <YAxis stroke="#999" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                <Legend />
                <Bar dataKey="Confidence" fill="#06b6d4" radius={8} />
                <Bar dataKey="Personalization" fill="#ec4899" radius={8} />
                <Bar dataKey="Open Rate" fill="#8b5cf6" radius={8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Email Status Distribution - Bar Chart */}
      <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Mail size={20} className="text-blue-400" />
          Email Status Distribution
        </h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                {
                  status: 'Drafted',
                  count: emails.drafted,
                  fill: '#f59e0b'
                },
                {
                  status: 'Sent',
                  count: emails.sent,
                  fill: '#10b981'
                },
                {
                  status: 'Opened',
                  count: emails.opened,
                  fill: '#0ea5e9'
                },
                {
                  status: 'Failed',
                  count: emails.failed,
                  fill: '#ef4444'
                }
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="status" stroke="#999" />
              <YAxis stroke="#999" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
              <Bar dataKey="count" fill="#06b6d4" radius={8}>
                {[
                  { status: 'Drafted', fill: '#f59e0b' },
                  { status: 'Sent', fill: '#10b981' },
                  { status: 'Opened', fill: '#0ea5e9' },
                  { status: 'Failed', fill: '#ef4444' }
                ].map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-green-400" />
          Conversion Funnel
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnel} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis type="number" stroke="#999" />
              <YAxis dataKey="stage" type="category" stroke="#999" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
              <Bar dataKey="count" fill="#8b5cf6" radius={8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Company Profile & Performance Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Profile */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Globe size={20} className="text-cyan-400" />
            Company Profile
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-700/30">
              <span className="text-sm text-slate-400">Company</span>
              <span className="font-semibold text-white">{company.name}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-700/30">
              <span className="text-sm text-slate-400">Industry</span>
              <span className="font-semibold text-white">{company.industry}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-700/30">
              <span className="text-sm text-slate-400">Size</span>
              <span className="font-semibold text-white">{company.size}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-700/30">
              <span className="text-sm text-slate-400">Location</span>
              <span className="font-semibold text-white">{company.location}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-700/30">
              <span className="text-sm text-slate-400">Decision Maker</span>
              <span className="font-semibold text-cyan-400 text-sm">{company.decision_maker}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Budget Signal</span>
              <span className="font-semibold text-amber-400 text-sm">{company.budget_indicator}</span>
            </div>
          </div>
        </div>

        {/* Performance Indicators */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Zap size={20} className="text-yellow-400" />
            Performance Indicators
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-slate-300">Email Quality</span>
                <span className="text-sm font-bold text-cyan-400">{performance.email_quality}%</span>
              </div>
              <div className="w-full bg-slate-700/30 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-400" style={{ width: `${performance.email_quality}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-slate-300">Personalization</span>
                <span className="text-sm font-bold text-pink-400">{performance.personalization_level}%</span>
              </div>
              <div className="w-full bg-slate-700/30 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-pink-500 to-rose-400" style={{ width: `${performance.personalization_level}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-slate-300">Engagement</span>
                <span className="text-sm font-bold text-green-400">{performance.engagement_potential}%</span>
              </div>
              <div className="w-full bg-slate-700/30 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400" style={{ width: `${performance.engagement_potential}%` }} />
              </div>
            </div>
            <div className="pt-2 border-t border-slate-700/30">
              <p className="text-sm text-slate-300">Campaign Momentum: <span className="font-bold text-amber-400">{performance.campaign_momentum}</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Email Types & Objection Handling */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email Types Distribution */}
        {Object.keys(email_types).length > 0 && (
          <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Mail size={20} className="text-blue-400" />
              Email Type Distribution
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={Object.entries(email_types).map(([name, value]) => ({
                      name: name.charAt(0).toUpperCase() + name.slice(1),
                      value: value
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#06b6d4" />
                    <Cell fill="#8b5cf6" />
                    <Cell fill="#ec4899" />
                    <Cell fill="#f59e0b" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Objection Handling */}
        {objections.top_objections && objections.top_objections.length > 0 && (
          <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <AlertCircle size={20} className="text-red-400" />
              Top Objections & Responses
            </h3>
            <div className="space-y-3">
              {objections.top_objections.map((obj, idx) => (
                <div key={idx} className="p-3 bg-slate-700/20 rounded border border-slate-600/30">
                  <p className="text-xs text-slate-400 mb-1">Objection {idx + 1}</p>
                  <p className="text-sm text-slate-200 mb-2">{obj.objection}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Response Quality</span>
                    <span className="text-xs font-bold text-green-400">{obj.response_quality}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Summary Metrics */}
      <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4">Campaign Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-cyan-400">{summary.total_actions}</p>
            <p className="text-xs text-slate-400 mt-1">Total Actions</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-400">{summary.engagement_rate}%</p>
            <p className="text-xs text-slate-400 mt-1">Engagement Rate</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-400">{summary.response_rate}%</p>
            <p className="text-xs text-slate-400 mt-1">Response Rate</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-400">{emails.total}</p>
            <p className="text-xs text-slate-400 mt-1">Emails Created</p>
          </div>
        </div>
      </div>

      {/* Follow-up Timeline */}
      {followups.total > 0 && (
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Clock size={20} className="text-purple-400" />
            Follow-up Timeline ({followups.total} scheduled)
          </h3>
          <div className="space-y-2">
            {followups.timeline.map((followup, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-slate-700/20 rounded border border-slate-600/30 hover:border-slate-500/50 transition-all">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {followup.day}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-300">{followup.rationale}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{followup.date ? new Date(followup.date).toLocaleDateString() : 'Pending'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Opportunity Details */}
      <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-emerald-400" />
          Opportunity Profile
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoCard label="Opportunity Score" value={opportunity.company_opportunity_score} unit="pts" color="text-green-400" />
          <InfoCard label="Fit Score" value={opportunity.fit_score} unit="pts" color="text-blue-400" />
          <InfoCard label="Urgency" value={opportunity.urgency_level.charAt(0).toUpperCase() + opportunity.urgency_level.slice(1)} color="text-orange-400" />
          <InfoCard label="Decision Maker" value={opportunity.decision_maker} color="text-purple-400" />
        </div>
      </div>
    </div>
  )
}

function MetricCard({ icon, label, value, subtext, gradient }) {
  return (
    <div className={`bg-gradient-to-br ${gradient}/20 border border-white/10 rounded-lg p-4 hover:border-white/20 transform hover:scale-105 transition-all duration-300`}>
      <div className="flex items-center justify-between mb-3">
        {icon}
        <div className={`text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${gradient}`}>
          {value}
        </div>
      </div>
      <h4 className="text-sm font-semibold text-white mb-1">{label}</h4>
      <p className="text-xs text-slate-400">{subtext}</p>
    </div>
  )
}

function StatusCard({ label, count, color, icon }) {
  return (
    <div className={`${color} border rounded-lg p-4 text-center hover:scale-105 transition-transform`}>
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-2xl font-bold mb-1">{count}</div>
      <div className="text-xs opacity-80">{label}</div>
    </div>
  )
}

function InfoCard({ label, value, unit, color }) {
  return (
    <div className="bg-slate-700/20 border border-slate-600/30 rounded-lg p-4 text-center">
      <p className="text-xs text-slate-400 mb-2">{label}</p>
      <p className={`text-xl font-bold ${color}`}>
        {value}{unit ? ` ${unit}` : ''}
      </p>
    </div>
  )
}
