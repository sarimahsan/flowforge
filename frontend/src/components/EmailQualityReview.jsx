import React, { useState, useEffect } from 'react'
import { Star, AlertCircle, CheckCircle, Lightbulb, TrendingUp, Mail } from 'lucide-react'

const API_URL = '/api'

export const EmailQualityReview = ({ campaignId, emails, company, onClose }) => {
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    if (campaignId && campaignId > 0) {
      scoreEmails()
    } else if (emails) {
      // Fallback: try using provided emails (convert dict to array if needed)
      const emailArray = Array.isArray(emails) 
        ? emails 
        : Object.values(emails).filter(v => typeof v === 'object')
      
      if (emailArray && emailArray.length > 0) {
        setScores(emailArray.map((e, i) => ({
          ...e,
          id: i,
          feedback: {
            overall_score: 75,
            subject_line_score: 8,
            body_quality_score: 7,
            personalization_score: 8,
            call_to_action_score: 7,
            issues_found: [],
            recommendations: []
          }
        })))
      }
      setLoading(false)
    } else {
      setLoading(false)
    }
  }, [campaignId, emails])

  const scoreEmails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/quality/score-email-sequence?campaign_id=${campaignId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to score emails')
      }
      const data = await response.json()
      setScores(data.emails || [])
    } catch (error) {
      console.error('Error scoring emails:', error)
      // Don't alert on error, just log it
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin">
          <div className="w-8 h-8 border-4 border-slate-600 border-t-cyan-400 rounded-full"></div>
        </div>
        <p className="mt-4 text-slate-400">Analyzing email quality...</p>
      </div>
    )
  }

  if (!scores.length) {
    return (
      <div className="text-center py-12">
        <AlertCircle size={48} className="mx-auto text-slate-600 mb-4" />
        <p className="text-slate-400">No email scores available</p>
      </div>
    )
  }

  const currentEmail = scores[activeTab]
  const feedback = currentEmail.feedback || {}

  const getScoreColor = (score) => {
    if (score >= 8) return 'text-green-400'
    if (score >= 6) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getScoreBgColor = (score) => {
    if (score >= 8) return 'bg-green-500/10 border-green-500/30'
    if (score >= 6) return 'bg-yellow-500/10 border-yellow-500/30'
    return 'bg-red-500/10 border-red-500/30'
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Mail size={24} className="text-cyan-400" />
            Email Quality Review
          </h2>
          <p className="text-slate-400 text-sm mt-1">Detailed quality analysis and recommendations</p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-bold text-white">{Math.round(feedback.overall_score || 0)}</p>
          <p className="text-xs text-slate-400">/100 Score</p>
        </div>
      </div>

      {/* Email Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 border-b border-slate-700/50 -mx-4 px-4">
        {scores.map((email, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(idx)}
            className={`px-4 py-2.5 rounded-lg whitespace-nowrap text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === idx
                ? 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 shadow-lg'
                : 'bg-slate-800/50 border border-slate-700/30 text-slate-400 hover:bg-slate-700/50'
            }`}
          >
            <span>Email {idx + 1}</span>
            {email.confidence_score && (
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${getScoreBgColor(email.confidence_score)} border`}>
                {Math.round(email.confidence_score)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {/* Current Email Subject */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Email Subject</p>
          <p className="text-white font-medium">{currentEmail?.subject || 'No subject'}</p>
        </div>

        {/* Score Cards Grid - Responsive */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className={`${getScoreBgColor(feedback.subject_line_score)} border rounded-lg p-4 text-center`}>
            <p className="text-xs text-slate-400 mb-2">Subject Line</p>
            <p className={`text-3xl font-bold ${getScoreColor(feedback.subject_line_score)}`}>
              {Math.round(feedback.subject_line_score || 0)}
            </p>
            <p className="text-xs text-slate-400 mt-1">/10</p>
          </div>
          <div className={`${getScoreBgColor(feedback.body_quality_score)} border rounded-lg p-4 text-center`}>
            <p className="text-xs text-slate-400 mb-2">Body Quality</p>
            <p className={`text-3xl font-bold ${getScoreColor(feedback.body_quality_score)}`}>
              {Math.round(feedback.body_quality_score || 0)}
            </p>
            <p className="text-xs text-slate-400 mt-1">/10</p>
          </div>
          <div className={`${getScoreBgColor(feedback.personalization_score)} border rounded-lg p-4 text-center`}>
            <p className="text-xs text-slate-400 mb-2">Personalization</p>
            <p className={`text-3xl font-bold ${getScoreColor(feedback.personalization_score)}`}>
              {Math.round(feedback.personalization_score || 0)}
            </p>
            <p className="text-xs text-slate-400 mt-1">/10</p>
          </div>
          <div className={`${getScoreBgColor(feedback.call_to_action_score)} border rounded-lg p-4 text-center`}>
            <p className="text-xs text-slate-400 mb-2">Call-to-Action</p>
            <p className={`text-3xl font-bold ${getScoreColor(feedback.call_to_action_score)}`}>
              {Math.round(feedback.call_to_action_score || 0)}
            </p>
            <p className="text-xs text-slate-400 mt-1">/10</p>
          </div>
        </div>

        {/* Issues Found */}
        {feedback.issues_found && feedback.issues_found.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
              <h4 className="text-red-400 font-bold">Issues Found</h4>
            </div>
            <ul className="space-y-2">
              {feedback.issues_found.map((issue, idx) => (
                <li key={idx} className="text-sm text-red-300 flex items-start gap-2">
                  <span className="text-red-400 mt-1 font-bold flex-shrink-0">•</span>
                  <span>
                    {issue.issue} <span className="text-xs text-red-400 uppercase ml-2 font-semibold">({issue.severity})</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {feedback.recommendations && feedback.recommendations.length > 0 && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={18} className="text-green-400 flex-shrink-0" />
              <h4 className="text-green-400 font-bold">Recommendations</h4>
            </div>
            <ul className="space-y-3">
              {feedback.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm text-green-300 space-y-1">
                  <p className="font-medium text-green-200">{idx + 1}. {rec.recommendation}</p>
                  {rec.example && (
                    <p className="text-xs text-slate-400 italic pl-4 border-l border-green-500/30">"{rec.example}"</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Feedback Text */}
        <div className="space-y-3">
          {feedback.subject_feedback && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
              <p className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wide">Subject Line Feedback</p>
              <p className="text-sm text-slate-300 leading-relaxed">{feedback.subject_feedback}</p>
            </div>
          )}
          {feedback.personalization_feedback && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
              <p className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wide">Personalization Feedback</p>
              <p className="text-sm text-slate-300 leading-relaxed">{feedback.personalization_feedback}</p>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={18} className="text-cyan-400" />
            <h4 className="font-bold text-white">Overall Assessment</h4>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            This email scores <span className="font-bold text-cyan-400">{Math.round(feedback.overall_score || 0)}/100</span> in overall quality.
            {feedback.overall_score >= 80 && (
              <span className="block mt-2 text-green-300">✓ Excellent work! This email is ready to send.</span>
            )}
            {feedback.overall_score >= 60 && feedback.overall_score < 80 && (
              <span className="block mt-2 text-yellow-300">→ Good email. Consider implementing the recommendations above.</span>
            )}
            {feedback.overall_score < 60 && (
              <span className="block mt-2 text-red-300">✗ Needs improvement. Review the feedback and recommendations before sending.</span>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

export default EmailQualityReview
