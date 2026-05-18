import React, { useState, useEffect } from 'react'
import { AlertTriangle, Zap, MessageSquare, Copy, Check } from 'lucide-react'

const API_URL = '/api'

export const ObjectionHandler = ({ campaignId, company, goal, analysis }) => {
  const [objections, setObjections] = useState([])
  const [loading, setLoading] = useState(false)
  const [expandedIndex, setExpandedIndex] = useState(null)
  const [copiedIndex, setCopiedIndex] = useState(null)

  // Load objections from database on mount
  useEffect(() => {
    if (campaignId) { 
      loadObjections()
    }
  }, [campaignId])

  const loadObjections = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/objections/for-campaign/${campaignId}`)
      const data = await response.json()
      setObjections(data.objections || [])
    } catch (error) {
      console.error('Error loading objections:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateObjections = async () => {
    // Generate new objections if they don't exist
    if (objections.length > 0) return

    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/objections/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company,
          goal,
          analysis
        })
      })
      const data = await response.json()
      setObjections(data.objections || [])
    } catch (error) {
      console.error('Error generating objections:', error)
      alert('Failed to generate objections')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const getLikelihoodColor = (likelihood) => {
    if (likelihood >= 80) return 'bg-red-500/20 border-red-500/30 text-red-400'
    if (likelihood >= 50) return 'bg-orange-500/20 border-orange-500/30 text-orange-400'
    return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
  }

  return (
    <div className="h-full flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Objection Handler</h2>
          <p className="text-slate-400 text-sm">Pre-generated prospect objections & responses</p>
        </div>
        {objections.length === 0 && (
          <button
            onClick={generateObjections}
            disabled={loading}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              loading
                ? 'bg-slate-700/50 text-slate-400 cursor-not-allowed'
                : 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30'
            }`}
          >
            {loading ? (
              <>
                <Zap size={18} className="inline mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap size={18} className="inline mr-2" />
                Generate
              </>
            )}
          </button>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-blue-300 text-sm">
          Sales reps get pre-written responses to the 3 most likely objections for <strong>{company}</strong>.
          Be ready before the prospect even objects!
        </p>
      </div>

      {/* Objections List */}
      {objections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertTriangle size={48} className="text-slate-600 mb-4" />
          <p className="text-slate-400">No objections generated yet. Click Generate to start.</p>
        </div>
      ) : (
        <div className="space-y-3 flex-1 overflow-y-auto">
          {objections.map((objection, idx) => (
            <div key={idx} className="bg-slate-800/40 border border-slate-700/50 rounded-lg overflow-hidden">
              {/* Objection Header */}
              <button
                onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                className="w-full px-4 py-3 flex items-start gap-3 hover:bg-slate-750 transition-colors text-left"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-lg font-bold text-white">#{idx + 1}</span>
                    <h4 className="text-white font-semibold text-base">{objection.objection}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded text-xs font-semibold border ${getLikelihoodColor(objection.likelihood_percentage)}`}>
                      {objection.likelihood_percentage}% likely
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-lg ${
                      objection.approach === 'empathetic' ? 'bg-blue-500/20 text-blue-300' :
                      objection.approach === 'logical' ? 'bg-purple-500/20 text-purple-300' :
                      objection.approach === 'social_proof' ? 'bg-green-500/20 text-green-300' :
                      'bg-orange-500/20 text-orange-300'
                    }`}>
                      {objection.approach === 'social_proof' ? 'Social Proof' : objection.approach}
                    </span>
                  </div>
                </div>
                <MessageSquare size={20} className={`flex-shrink-0 transition-transform ${expandedIndex === idx ? 'text-cyan-400' : 'text-slate-400'}`} />
              </button>

              {/* Expanded Content */}
              {expandedIndex === idx && (
                <div className="border-t border-slate-700 px-4 py-3 space-y-3 bg-slate-900/30">
                  {/* Context */}
                  {objection.context && (
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Why This Objection?</p>
                      <p className="text-sm text-slate-300">{objection.context}</p>
                    </div>
                  )}

                  {/* Primary Response */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-slate-400">Primary Response</p>
                      <button
                        onClick={() => copyToClipboard(objection.response, idx)}
                        className={`p-1 rounded hover:bg-slate-700 transition-colors ${copiedIndex === idx ? 'text-green-400' : 'text-slate-400'}`}
                      >
                        {copiedIndex === idx ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                    <div className="bg-slate-700/50 rounded p-3 text-sm text-slate-300 border border-slate-600">
                      {objection.response}
                    </div>
                  </div>

                  {/* Alternative Responses */}
                  {objection.alternatives && objection.alternatives.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-400 mb-2">Alternative Responses</p>
                      {objection.alternatives.map((alt, altIdx) => (
                        <div key={altIdx} className="mb-2">
                          <button
                            onClick={() => copyToClipboard(alt, `${idx}-${altIdx}`)}
                            className={`flex items-start gap-2 w-full p-2 rounded hover:bg-slate-700 transition-colors text-left ${copiedIndex === `${idx}-${altIdx}` ? 'text-green-400' : 'text-slate-300'}`}
                          >
                            <span className="text-xs text-slate-500 mt-1 flex-shrink-0">Alt {altIdx + 1}</span>
                            <span className="text-xs text-slate-400 flex-1">{alt}</span>
                            {copiedIndex === `${idx}-${altIdx}` ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Triggers */}
                  {objection.triggers && objection.triggers.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-400 mb-2">Common Triggers</p>
                      <div className="flex flex-wrap gap-2">
                        {objection.triggers.map((trigger, trigIdx) => (
                          <span key={trigIdx} className="text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded">
                            {trigger}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pro Tip */}
      {objections.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-300">
          <strong>Pro Tip:</strong> Copy these responses into your notes before the call. Modify slightly to sound natural!
        </div>
      )}
    </div>
  )
}

export default ObjectionHandler

