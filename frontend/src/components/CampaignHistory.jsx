import { useState, useEffect } from "react"
import { Clock, ChevronRight, Trash2, GripVertical, Mail, AlertCircle, CheckCircle, Loader } from "lucide-react"

const API_URL = "/api"

export default function CampaignHistory({ onLoadCampaign, onCampaignLoaded }) {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedCampaignId, setSelectedCampaignId] = useState(null)
  const [expandedCampaignId, setExpandedCampaignId] = useState(null)
  const [error, setError] = useState(null)

  // Load campaigns on mount
  useEffect(() => {
    loadCampaigns()
  }, [])

  // Load all campaigns
  const loadCampaigns = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_URL}/campaigns/list-all`)
      if (!response.ok) {
        throw new Error(`Failed to load campaigns: ${response.statusText}`)
      }
      const data = await response.json()
      setCampaigns(data.campaigns || [])
    } catch (err) {
      setError(err.message)
      console.error("Error loading campaigns:", err)
    } finally {
      setLoading(false)
    }
  }

  // Load specific campaign and pass data to parent
  const handleLoadCampaign = async (campaignId) => {
    try {
      const response = await fetch(`${API_URL}/campaigns/${campaignId}/details`)
      if (!response.ok) {
        throw new Error(`Failed to load campaign details: ${response.statusText}`)
      }
      const campaignData = await response.json()
      
      // Call parent callback with campaign data
      if (onCampaignLoaded) {
        onCampaignLoaded(campaignData)
      }
      
      // Call the other callback if provided
      if (onLoadCampaign) {
        onLoadCampaign(campaignData)
      }
      
      setSelectedCampaignId(campaignId)
    } catch (err) {
      console.error("Error loading campaign:", err)
      alert(`Failed to load campaign: ${err.message}`)
    }
  }

  // Delete campaign
  const handleDeleteCampaign = async (campaignId, e) => {
    e.stopPropagation()
    if (window.confirm("Are you sure you want to delete this campaign? This cannot be undone.")) {
      try {
        const response = await fetch(`${API_URL}/campaigns/${campaignId}/delete`, { 
          method: 'DELETE'
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || 'Failed to delete campaign')
        }
        
        // Delete from local state
        setCampaigns(campaigns.filter(c => c.campaign_id !== campaignId))
        alert("✅ Campaign deleted successfully")
      } catch (err) {
        console.error("Error deleting campaign:", err)
        alert(`Failed to delete campaign: ${err.message}`)
        // Reload campaigns if deletion fails
        loadCampaigns()
      }
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const getStatusColor = (status) => {
    const colors = {
      draft: "bg-slate-500/20 text-slate-300 border-slate-500/30",
      active: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      completed: "bg-green-500/20 text-green-300 border-green-500/30",
      paused: "bg-amber-500/20 text-amber-300 border-amber-500/30"
    }
    return colors[status] || colors.draft
  }

  const getStatusIcon = (status) => {
    const icons = {
      draft: null,
      active: <Loader size={12} className="animate-spin" />,
      completed: <CheckCircle size={12} />,
      paused: <AlertCircle size={12} />
    }
    return icons[status]
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Clock size={24} className="text-purple-400" />
          <div>
            <h3 className="text-lg font-bold text-white">Campaign History</h3>
            <p className="text-xs text-slate-400">{campaigns.length} campaigns saved</p>
          </div>
        </div>
        <button
          onClick={loadCampaigns}
          disabled={loading}
          className="px-3 py-2 text-xs font-semibold rounded-md bg-white/5 border border-white/10 hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && campaigns.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <Loader size={32} className="animate-spin mb-3" />
          <p className="text-sm">Loading campaigns...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && campaigns.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
          <Clock size={32} className="mb-3 opacity-50" />
          <p className="text-sm font-medium">No campaigns yet</p>
          <p className="text-xs mt-1">Generate a campaign to see it here</p>
        </div>
      )}

      {/* Campaigns List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
        {campaigns.map((campaign) => (
          <div
            key={campaign.campaign_id}
            className={`border rounded-lg transition-all cursor-pointer group ${
              selectedCampaignId === campaign.campaign_id
                ? "border-purple-500/50 bg-purple-500/10"
                : "border-slate-700/30 bg-slate-800/20 hover:border-slate-600/50 hover:bg-slate-800/40"
            }`}
          >
            {/* Campaign Header */}
            <div
              className="p-3 flex items-start gap-3"
              onClick={() => {
                setExpandedCampaignId(expandedCampaignId === campaign.campaign_id ? null : campaign.campaign_id)
              }}
            >
              <GripVertical size={16} className="text-slate-600 mt-0.5 flex-shrink-0" />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-white text-sm truncate">{campaign.company_name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{campaign.goal}</p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium border flex items-center gap-1 flex-shrink-0 ${getStatusColor(campaign.status)}`}>
                    {getStatusIcon(campaign.status)}
                    <span className="capitalize">{campaign.status}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-3 mt-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Mail size={12} />
                    {campaign.emails_count} emails
                  </span>
                  <span className="flex items-center gap-1">
                    <AlertCircle size={12} />
                    {campaign.objections_count} objections
                  </span>
                  <span className="text-slate-500">
                    {formatDate(campaign.created_at)}
                  </span>
                </div>
              </div>

              {/* Expand Icon */}
              <ChevronRight
                size={18}
                className={`text-slate-500 flex-shrink-0 mt-0.5 transition-transform ${
                  expandedCampaignId === campaign.campaign_id ? "rotate-90" : ""
                }`}
              />
            </div>

            {/* Expanded Details */}
            {expandedCampaignId === campaign.campaign_id && (
              <div className="px-3 pb-3 pt-0 text-xs text-slate-400 space-y-2 border-t border-slate-700/30">
                {/* Analysis Preview */}
                {campaign.analysis && Object.keys(campaign.analysis).length > 0 && (
                  <div className="bg-slate-900/40 rounded p-2">
                    <p className="font-semibold text-slate-300 mb-1">Analysis</p>
                    <div className="space-y-0.5">
                      {Object.entries(campaign.analysis).slice(0, 3).map(([key, value]) => (
                        <p key={key} className="text-slate-400">
                          <span className="capitalize">{key}:</span> {typeof value === "string" ? value.substring(0, 50) : JSON.stringify(value).substring(0, 50)}...
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Emails Preview */}
                {campaign.emails.length > 0 && (
                  <div className="bg-slate-900/40 rounded p-2">
                    <p className="font-semibold text-slate-300 mb-1">Latest Email</p>
                    <p className="text-slate-400">
                      <span className="font-medium">Subject:</span> {campaign.emails[0].subject}
                    </p>
                    <p className="text-slate-400 line-clamp-2 mt-1">{campaign.emails[0].body}</p>
                  </div>
                )}

                {/* Load Button */}
                <button
                  onClick={() => handleLoadCampaign(campaign.campaign_id)}
                  className="w-full py-2 px-3 rounded bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white text-xs font-bold uppercase tracking-wide transition-all mt-2"
                >
                  Load This Campaign
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
