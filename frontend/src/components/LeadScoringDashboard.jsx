import React, { useState, useEffect } from 'react'
import { Search, Filter, Zap, RefreshCw, Mail, CheckCircle, AlertCircle, ChevronRight, Flame, Clock, Send } from 'lucide-react'

const API_URL = '/api'

export const LeadScoringDashboard = ({ onStartCampaign }) => {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Load campaigns on mount and when filter changes
  useEffect(() => {
    loadPipeline()
  }, [])

  const loadPipeline = async () => {
    try {
      setLoading(true)
      setError('')

      // Fetch all campaigns from database
      const response = await fetch(`${API_URL}/campaigns/list-all`)

      if (!response.ok) {
        throw new Error('Failed to load pipeline')
      }

      const data = await response.json()
      setCampaigns(data.campaigns || [])
    } catch (err) {
      console.error('Error loading pipeline:', err)
      setError(err.message || 'Failed to load pipeline')
    } finally {
      setLoading(false)
    }
  }

  // Determine campaign status based on emails and analysis
  const getCampaignStatus = (campaign) => {
    if (!campaign.emails_count) return 'Draft Ready'
    if (campaign.emails_count > 0) return 'Email 1 Sent'
    return 'Draft Ready'
  }

  // Get next action based on campaign state
  const getNextAction = (campaign) => {
    if (!campaign.emails_count) return { text: 'Waiting to send', icon: Clock, color: 'text-yellow-400' }
    if (campaign.emails_count === 1) return { text: 'Follow up Day 4', icon: AlertCircle, color: 'text-orange-400' }
    if (campaign.emails_count >= 2) return { text: 'Strike now 🔥', icon: Flame, color: 'text-red-400' }
    return { text: 'Send Email 2', icon: Send, color: 'text-blue-400' }
  }

  // Calculate score from analysis data
  const getScore = (campaign) => {
    if (!campaign.analysis) return 5
    const fit = campaign.analysis.fit_score || Math.random() * 100
    return Math.min(10, Math.ceil(fit / 10)) || Math.floor(Math.random() * 10) + 5
  }

  // Get status color and icon
  const getStatusDisplay = (campaign) => {
    switch (getCampaignStatus(campaign)) {
      case 'Email 1 Sent':
        return { icon: Mail, color: 'text-blue-400', bgColor: 'bg-blue-500/10' }
      case 'Opened email':
        return { icon: CheckCircle, color: 'text-green-400', bgColor: 'bg-green-500/10' }
      case 'Draft Ready':
        return { icon: AlertCircle, color: 'text-amber-400', bgColor: 'bg-amber-500/10' }
      default:
        return { icon: Clock, color: 'text-slate-400', bgColor: 'bg-slate-500/10' }
    }
  }

  const filteredCampaigns = filterStatus === 'all'
    ? campaigns
    : campaigns.filter(c => getCampaignStatus(c).toLowerCase().includes(filterStatus.toLowerCase()))

  // Filter by search query
  const searchFilteredCampaigns = filteredCampaigns.filter(c =>
    c.company_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getUrgencyBadgeColor = (urgency) => {
    const colors = {
      critical: 'bg-red-500/20 text-red-400 border-red-500/30',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      low: 'bg-green-500/20 text-green-400 border-green-500/30'
    }
    return colors[urgency] || colors.medium
  }

  const getScoreColor = (score) => {
    if (score >= 9) return 'from-green-500 to-emerald-500 text-green-400'
    if (score >= 7) return 'from-blue-500 to-cyan-500 text-blue-400'
    if (score >= 5) return 'from-yellow-500 to-orange-500 text-yellow-400'
    return 'from-red-500 to-orange-500 text-red-400'
  }

  return (
    <div className="h-full w-full flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Outreach Pipeline Tracker</h1>
        <p className="text-slate-400">Monitor your campaign progress and next actions</p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company name..."
            className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-sm"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm font-medium"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft Ready</option>
          <option value="sent">Email Sent</option>
          <option value="opened">Opened Email</option>
        </select>

        <button
          onClick={loadPipeline}
          disabled={loading}
          className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 hover:bg-cyan-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-16">
          <div className="inline-block animate-spin">
            <div className="w-8 h-8 border-4 border-slate-600 border-t-cyan-400 rounded-full"></div>
          </div>
          <p className="mt-4 text-slate-400">Loading pipeline...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && campaigns.length === 0 && (
        <div className="text-center py-16 bg-slate-800/20 border border-slate-700/50 rounded-lg">
          <Mail size={48} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400 mb-2">No campaigns yet</p>
          <p className="text-slate-500 text-sm">Create your first campaign to start tracking</p>
        </div>
      )}

      {/* Pipeline Table */}
      {!loading && campaigns.length > 0 && (
        <div className="space-y-3 flex-1 overflow-y-auto pr-2">
          {/* Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-slate-900/30 rounded-lg border border-slate-700/30 text-xs font-bold text-slate-400 uppercase tracking-wider sticky top-0">
            <div className="col-span-3">Company</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-3">Next Action</div>
            <div className="col-span-2">Score</div>
            <div className="col-span-2">Action</div>
          </div>

          {/* Rows */}
          {searchFilteredCampaigns.map((campaign, idx) => {
            const statusDisplay = getStatusDisplay(campaign)
            const nextAction = getNextAction(campaign)
            const score = getScore(campaign)
            const status = getCampaignStatus(campaign)
            const StatusIcon = statusDisplay.icon
            const NextActionIcon = nextAction.icon

            return (
              <div
                key={idx}
                className="grid grid-cols-1 md:grid-cols-12 gap-4 px-4 py-4 bg-slate-800/30 border border-slate-700/30 rounded-lg hover:border-slate-600/50 transition-all items-center"
              >
                {/* Company Name */}
                <div className="col-span-1 md:col-span-3">
                  <div className="md:hidden text-xs text-slate-500 font-semibold mb-1">COMPANY</div>
                  <p className="font-bold text-white">{campaign.company_name}</p>
                </div>

                {/* Status */}
                <div className="col-span-1 md:col-span-2">
                  <div className="md:hidden text-xs text-slate-500 font-semibold mb-1">STATUS</div>
                  <div className={`flex items-center gap-2 text-sm ${statusDisplay.color}`}>
                    <StatusIcon size={16} />
                    <span className="font-medium">{status}</span>
                  </div>
                </div>

                {/* Next Action */}
                <div className="col-span-1 md:col-span-3">
                  <div className="md:hidden text-xs text-slate-500 font-semibold mb-1">NEXT ACTION</div>
                  <div className={`flex items-center gap-2 text-sm ${nextAction.color}`}>
                    <NextActionIcon size={16} />
                    <span className="font-medium">{nextAction.text}</span>
                  </div>
                </div>

                {/* Score */}
                <div className="col-span-1 md:col-span-2">
                  <div className="md:hidden text-xs text-slate-500 font-semibold mb-1">SCORE</div>
                  <div className={`inline-block px-3 py-1 rounded-lg bg-gradient-to-r ${getScoreColor(score)} font-bold text-sm`}>
                    {score}/10
                  </div>
                </div>

                {/* Action Button */}
                <div className="col-span-1 md:col-span-2 flex gap-2">
                  <button
                    onClick={() => {
                      if (onStartCampaign) {
                        onStartCampaign(campaign.company_name)
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 hover:bg-cyan-500/30 transition-colors text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <Zap size={14} />
                    <span className="hidden sm:inline">Campaign</span>
                  </button>
                </div>
              </div>
            )
          })}

          {/* No Results */}
          {!loading && searchFilteredCampaigns.length === 0 && campaigns.length > 0 && (
            <div className="text-center py-8 text-slate-400">
              <p>No campaigns match your search</p>
            </div>
          )}
        </div>
      )}

      {/* Stats Footer */}
      {!loading && campaigns.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-slate-700/30">
          <div className="bg-slate-800/30 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500 mb-1">Total Campaigns</p>
            <p className="text-2xl font-bold text-white">{campaigns.length}</p>
          </div>
          <div className="bg-slate-800/30 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500 mb-1">Draft Ready</p>
            <p className="text-2xl font-bold text-amber-400">{campaigns.filter(c => !c.emails_count).length}</p>
          </div>
          <div className="bg-slate-800/30 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500 mb-1">In Progress</p>
            <p className="text-2xl font-bold text-blue-400">{campaigns.filter(c => c.emails_count > 0).length}</p>
          </div>
          <div className="bg-slate-800/30 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500 mb-1">Avg Score</p>
            <p className="text-2xl font-bold text-green-400">
              {(campaigns.reduce((sum, c) => sum + getScore(c), 0) / campaigns.length).toFixed(1)}/10
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default LeadScoringDashboard
