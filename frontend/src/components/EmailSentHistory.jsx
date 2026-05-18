import { useState, useEffect } from "react"
import { Trash2, Mail, CheckCircle, AlertCircle, Clock, Search, Filter, Download, Plus } from "lucide-react"

const API_URL = "/api"

export default function EmailSentHistory({ campaignId, emails, onDelete }) {
  const [sentEmails, setSentEmails] = useState([])
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedId, setExpandedId] = useState(null)
  const [error, setError] = useState(null)

  // Load sent emails from database
  useEffect(() => {
    if (campaignId) {
      loadEmailHistory()
    } else {
      setSentEmails([])
    }
  }, [campaignId])

  const loadEmailHistory = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch emails from campaign
      const url = `${API_URL}/campaigns/${campaignId}/details`
      
      const response = await fetch(url)
      
      if (response.ok) {
        const data = await response.json()
        
        if (!data.emails || data.emails.length === 0) {
          setSentEmails([])
          return
        }
        
        // Map campaign emails with actual status and recipient data
        const history = data.emails.map((email) => ({
          id: email.id,
          subject: email.subject,
          body: email.body,
          type: email.type || 'balanced',
          recipient: email.to_email,
          status: email.status || 'draft',
          sentAt: email.sent_at,
          openedAt: email.opened_at,
          openCount: email.open_count || 0,
          sequenceNumber: email.sequence_number
        }))
        
        setSentEmails(history)
      } else {
        setError(`Failed to load emails (Status: ${response.status})`)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEmail = (emailId) => {
    if (window.confirm("Are you sure you want to delete this email? This action cannot be undone.")) {
      setSentEmails(sentEmails.filter(email => email.id !== emailId))
      if (onDelete) onDelete(emailId)
    }
  }

  const handleSendEmail = (emailId, recipient) => {
    if (!recipient || !recipient.trim()) {
      alert("Please enter a recipient email address")
      return
    }

    const email = sentEmails.find(e => e.id === emailId)
    if (!email) return


    
    const payload = { recipient: recipient }

    // Send to backend with JSON body
    fetch(`${API_URL}/emails/${emailId}/send`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            throw new Error(err.detail || `HTTP ${res.status}`)
          })
        }
        return res.json()
      })
      .then(data => {
        alertMessage(`✅ Email sent to ${recipient}!`, 'success')
        loadEmailHistory()
      })
      .catch(err => {
        alertMessage(`❌ Failed to send email: ${err.message}`, 'error')
      })
  }

  const alertMessage = (message, type) => {
    if (type === 'success') {
      alert(message)
    } else {
      alert(message)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent':
        return 'bg-green-500/10 border-green-500/30 text-green-400'
      case 'opened':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-400'
      case 'draft':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-400'
      case 'failed':
        return 'bg-red-500/10 border-red-500/30 text-red-400'
      default:
        return 'bg-slate-500/10 border-slate-500/30 text-slate-400'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return <CheckCircle size={16} />
      case 'opened':
        return <Mail size={16} className="text-blue-400" />
      case 'draft':
        return <Clock size={16} />
      case 'failed':
        return <AlertCircle size={16} />
      default:
        return <Clock size={16} />
    }
  }

  const filteredEmails = sentEmails.filter(email => {
    const matchesStatus = filterStatus === 'all' || email.status === filterStatus
    const matchesSearch = email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (email.recipient && email.recipient.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesStatus && matchesSearch
  })

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-700/30">
        <div className="flex items-center gap-3">
          <Mail size={24} className="text-cyan-400" />
          <div>
            <h3 className="text-lg font-bold text-white">Email History</h3>
            <p className="text-xs text-slate-400">{sentEmails.length} emails total</p>
          </div>
        </div>
        <button
          onClick={() => {
            loadEmailHistory()
          }}
          disabled={loading}
          className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all disabled:opacity-50"
          title="Refresh email history"
        >
          <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Controls */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by subject or recipient..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-10 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm font-medium"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="opened">Opened</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Loading State */}
      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
          <p className="font-bold">❌ Error: {error}</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin">
            <Clock size={32} className="text-cyan-400" />
          </div>
          <p className="ml-3 text-slate-400">Loading email history...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && sentEmails.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Mail size={48} className="text-slate-600 mb-3" />
          <p className="text-slate-400 mb-1">No emails yet</p>
          <p className="text-slate-500 text-sm">Emails from campaigns will appear here</p>
          <p className="text-xs text-slate-600 mt-4 bg-slate-900/50 p-3 rounded w-full">
            Debug Info:
            <br />
            campaignId = {campaignId || 'null'}
            <br />
            sentEmails.length = {sentEmails.length}
            <br />
            loading = {loading}
            <br />
            error = {error || 'none'}
          </p>
          <button
            onClick={() => {
              alert('No emails to display')
            }}
            className="mt-2 text-xs text-cyan-400 hover:text-cyan-300 underline"
          >
            Refresh
          </button>
        </div>
      )}

      {/* Email List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
        {filteredEmails.length > 0 ? (
          filteredEmails.map((email) => (
            <div
              key={email.id}
              className="bg-slate-800/30 border border-slate-700/30 rounded-lg overflow-hidden hover:border-slate-600/50 transition-all"
            >
            {/* Header Row */}
            <div
              className="px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-slate-800/50 transition-colors"
              onClick={() => setExpandedId(expandedId === email.id ? null : email.id)}
            >
              {/* Status Icon */}
              <div className={`flex-shrink-0 p-2 rounded-lg border ${getStatusColor(email.status)}`}>
                {getStatusIcon(email.status)}
              </div>

              {/* Main Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-white truncate">{email.subject}</h4>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                  {email.recipient && (
                    <span className="flex items-center gap-1">
                      <Mail size={12} />
                      {email.recipient}
                    </span>
                  )}
                  {email.sentAt && (
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {email.sentAt}
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded border flex items-center gap-1 ${getStatusColor(email.status)}`}>
                    {getStatusIcon(email.status)}
                    <span className="capitalize">{email.status}</span>
                  </span>
                </div>
              </div>

              {/* Delete Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteEmail(email.id)
                }}
                className="flex-shrink-0 p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                title="Delete this email"
              >
                <Trash2 size={18} />
              </button>
            </div>

            {/* Expanded Content */}
            {expandedId === email.id && (
              <div className="px-4 pb-4 pt-0 border-t border-slate-700/20 space-y-3">
                {/* Email Body Preview */}
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 font-semibold mb-2">Email Body</p>
                  <p className="text-sm text-slate-300 line-clamp-4">{email.body}</p>
                </div>

                {/* Email Details */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-500 font-semibold">Type</p>
                    <p className="text-slate-300 capitalize">{email.type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold">Sequence</p>
                    <p className="text-slate-300">Email #{email.sequenceNumber}</p>
                  </div>
                </div>

                {/* Send Form if Draft */}
                {email.status === 'draft' && (
                  <div className="bg-slate-900/50 rounded-lg p-3 space-y-2">
                    <p className="text-xs text-slate-400 font-semibold">Send Email</p>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        id={`recipient-${email.id}`}
                        placeholder="recipient@company.com"
                        className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        onClick={() => {
                          const recipient = document.getElementById(`recipient-${email.id}`).value
                          handleSendEmail(email.id, recipient)
                        }}
                        className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded hover:bg-cyan-500/30 transition-colors text-sm font-bold flex items-center gap-2"
                      >
                        <Mail size={14} />
                        Send
                      </button>
                    </div>
                  </div>
                )}

                {/* Sent Details if SENT */}
                {email.status === 'sent' && (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-green-500/10 border border-green-500/20 rounded p-2">
                      <p className="text-xs text-green-400 font-semibold">Sent To</p>
                      <p className="text-slate-300 truncate">{email.recipient}</p>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded p-2">
                      <p className="text-xs text-blue-400 font-semibold">Sent At</p>
                      <p className="text-slate-300 text-xs">{email.sentAt}</p>
                    </div>
                  </div>
                )}

                {/* Opened Details if OPENED */}
                {email.status === 'opened' && (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-green-500/10 border border-green-500/20 rounded p-2">
                      <p className="text-xs text-green-400 font-semibold">Sent To</p>
                      <p className="text-slate-300 truncate">{email.recipient}</p>
                    </div>
                    <div className="bg-cyan-500/10 border border-cyan-500/20 rounded p-2">
                      <p className="text-xs text-cyan-400 font-semibold">Opened At</p>
                      <p className="text-slate-300 text-xs">{email.openedAt}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(email.body)
                      alert('Email body copied to clipboard!')
                    }}
                    className="flex-1 px-3 py-2 bg-slate-700/30 border border-slate-600/30 text-slate-300 rounded hover:bg-slate-700/50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Download size={14} />
                    Copy
                  </button>
                  <button
                    onClick={() => setExpandedId(null)}
                    className="flex-1 px-3 py-2 bg-slate-700/30 border border-slate-600/30 text-slate-300 rounded hover:bg-slate-700/50 transition-colors text-sm font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
        ) : (
          <div className="text-center py-8 text-slate-400">
            <Search size={32} className="mx-auto mb-2 opacity-50" />
            <p>No emails with current filters</p>
          </div>
        )}
      </div>

      {/* Summary Footer */}
      {sentEmails.length > 0 && (
        <div className="border-t border-slate-700/30 pt-3 grid grid-cols-3 gap-2">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 text-center">
            <p className="text-xs text-amber-400">Drafts</p>
            <p className="text-lg font-bold text-white">{sentEmails.filter(e => e.status === 'draft').length}</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 text-center">
            <p className="text-xs text-green-400">Sent</p>
            <p className="text-lg font-bold text-white">{sentEmails.filter(e => e.status === 'sent').length}</p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 text-center">
            <p className="text-xs text-blue-400">Opened</p>
            <p className="text-lg font-bold text-white">{sentEmails.filter(e => e.status === 'opened').length}</p>
          </div>
        </div>
      )}
    </div>
  )
}
