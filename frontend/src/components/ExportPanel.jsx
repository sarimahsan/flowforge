import React, { useState } from 'react'
import { Download, FileText, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import jsPDF from 'jspdf'

const API_URL = '/api'

export const ExportPanel = ({ campaignId, campaignData }) => {
  const [exporting, setExporting] = useState(false)
  const [exportResult, setExportResult] = useState(null)

  const downloadCampaignPDF = async () => {
    try {
      setExporting(true)
      
      // Fetch campaign analytics for comprehensive data
      const analyticsRes = await fetch(`${API_URL}/campaigns/${campaignId}/analytics`)
      const analytics = await analyticsRes.json()

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4')
      let yPosition = 15

      // Helper function to add text
      const addText = (text, size, bold = false, color = [0, 0, 0]) => {
        pdf.setFontSize(size)
        pdf.setFont('helvetica', bold ? 'bold' : 'normal')
        pdf.setTextColor(color[0], color[1], color[2])
        const maxWidth = 180
        const splitText = pdf.splitTextToSize(text, maxWidth)
        pdf.text(splitText, 15, yPosition)
        yPosition += (splitText.length * size * 0.35) + 3
      }

      // Add page break if needed
      const checkPageBreak = (spaceNeeded = 40) => {
        if (yPosition + spaceNeeded > 270) {
          pdf.addPage()
          yPosition = 15
        }
      }

      // Title
      addText(`Campaign Report: ${analytics.campaign_name || analyticsData.company || 'Campaign'}`, 20, true, [59, 130, 246])

      // Metadata
      checkPageBreak(30)
      addText(`Company: ${analytics.company_name}`, 11, false)
      addText(`Status: ${analytics.status}`, 11, false)
      addText(`Created: ${new Date(analytics.created_at).toLocaleDateString()}`, 11, false)
      addText(`Last Updated: ${new Date(analytics.updated_at).toLocaleDateString()}`, 11, false)

      // ========== COMPANY PROFILE ==========
      checkPageBreak(50)
      addText('COMPANY PROFILE', 14, true, [34, 197, 94])
      const company = analytics.company || {}
      addText(`Industry: ${company.industry || 'N/A'}`, 10, false)
      addText(`Company Size: ${company.size || 'N/A'}`, 10, false)
      addText(`Location: ${company.location || 'N/A'}`, 10, false)
      addText(`Decision Maker: ${company.decision_maker || 'N/A'}`, 10, false)
      addText(`Opportunity Score: ${company.opportunity_score || 0}/100`, 10, false)
      addText(`Fit Score: ${company.fit_score || 0}/100`, 10, false)
      addText(`Urgency Level: ${company.urgency || 'N/A'}`, 10, false)

      // ========== EMAIL CAMPAIGN OVERVIEW ==========
      checkPageBreak(50)
      addText('EMAIL CAMPAIGN OVERVIEW', 14, true, [34, 197, 94])
      const emails = analytics.emails || {}
      addText(`Total Emails Created: ${emails.total || 0}`, 10, false)
      addText(`Drafted: ${emails.drafted || 0} | Sent: ${emails.sent || 0} | Opened: ${emails.opened || 0}`, 10, false)
      addText(`Average Confidence Score: ${(emails.avg_confidence_score || 0).toFixed(1)}/100`, 10, false)
      addText(`Average Personalization Score: ${(emails.avg_personalization_score || 0).toFixed(1)}/10`, 10, false)
      addText(`Open Rate: ${emails.open_rate || 0}%`, 10, false)

      // ========== EMAIL SEQUENCE DETAILS ==========
      checkPageBreak(50)
      addText('EMAIL SEQUENCE DETAILS', 14, true, [34, 197, 94])
      const emailPerformance = analytics.email_performance || []
      emailPerformance.forEach((email, idx) => {
        checkPageBreak(25)
        addText(`Email #${email.sequence || idx + 1}: ${email.subject}`, 11, true)
        addText(`Status: ${email.status} | Confidence: ${email.confidence || 0} | Personalization: ${email.personalization || 0}`, 9, false)
      })

      // ========== EMAIL QUALITY DISTRIBUTION ==========
      checkPageBreak(40)
      addText('QUALITY DISTRIBUTION', 14, true, [34, 197, 94])
      const quality = analytics.quality_distribution || {}
      addText(`Excellent: ${quality.excellent || 0}`, 10, false)
      addText(`Good: ${quality.good || 0}`, 10, false)
      addText(`Fair: ${quality.fair || 0}`, 10, false)
      addText(`Poor: ${quality.poor || 0}`, 10, false)

      // ========== CONVERSION FUNNEL ==========
      checkPageBreak(50)
      addText('CONVERSION FUNNEL ANALYSIS', 14, true, [34, 197, 94])
      const funnel = analytics.funnel || []
      funnel.forEach(stage => {
        checkPageBreak(20)
        addText(`${stage.stage}: ${stage.count} (${stage.percentage}%)`, 10, false)
      })

      // ========== OBJECTIONS & RESPONSES ==========
      checkPageBreak(50)
      addText('OBJECTIONS & RESPONSES', 14, true, [34, 197, 94])
      const objections = analytics.objections || {}
      addText(`Total Objections: ${objections.total || 0}`, 10, false)
      addText(`Coverage: ${objections.covered_percentage || 0}%`, 10, false)
      
      const topObjections = objections.top_objections || []
      topObjections.forEach((obj, idx) => {
        checkPageBreak(25)
        const objStr = typeof obj === 'string' ? obj : obj.objection || ''
        const cleanObj = objStr.replace(/@\{|=|;\}/g, ' ').substring(0, 100)
        addText(`${idx + 1}. ${cleanObj}...`, 9, false)
      })

      // ========== PERFORMANCE METRICS ==========
      checkPageBreak(50)
      addText('PERFORMANCE INDICATORS', 14, true, [34, 197, 94])
      const performance = analytics.performance || {}
      addText(`Email Quality: ${performance.email_quality || 0}/100`, 10, false)
      addText(`Personalization Level: ${performance.personalization_level || 0}/10`, 10, false)
      addText(`Engagement Potential: ${performance.engagement_potential || 0}%`, 10, false)
      addText(`Objection Coverage: ${performance.objection_coverage || 0}%`, 10, false)
      addText(`Follow-up Readiness: ${performance.follow_up_readiness || 0}`, 10, false)
      addText(`Campaign Momentum: ${performance.campaign_momentum || 'N/A'}`, 10, false)

      // ========== FOLLOW-UP SCHEDULE ==========
      checkPageBreak(50)
      addText('FOLLOW-UP SCHEDULE', 14, true, [34, 197, 94])
      const followups = analytics.followups || {}
      addText(`Total Follow-ups Planned: ${followups.total || 0}`, 10, false)
      const timeline = followups.timeline || []
      timeline.forEach((fu, idx) => {
        const fuStr = typeof fu === 'string' ? fu : (fu.day ? `Day ${fu.day}` : '')
        addText(`  • ${fuStr}`, 9, false)
      })

      // ========== SUMMARY & HEALTH SCORE ==========
      checkPageBreak(40)
      addText('CAMPAIGN SUMMARY', 14, true, [34, 197, 94])
      const summary = analytics.summary || {}
      addText(`Total Actions: ${summary.total_actions || 0}`, 10, false)
      addText(`Engagement Rate: ${summary.engagement_rate || 0}%`, 10, false)
      addText(`Response Rate: ${summary.response_rate || 0}%`, 10, false)
      addText(`Campaign Status: ${summary.campaign_status || 'N/A'}`, 10, false)
      
      checkPageBreak(20)
      addText(`HEALTH SCORE: ${Math.round(analytics.health_score || 0)}`, 16, true, [34, 197, 94])

      // Save PDF
      pdf.save(`Campaign_Report_${analytics.campaign_name || 'Export'}_${new Date().toISOString().slice(0, 10)}.pdf`)

      setExportResult({
        success: true,
        message: '✅ Campaign PDF downloaded successfully!'
      })
    } catch (error) {
      console.error('Error generating PDF:', error)
      setExportResult({
        success: false,
        message: `❌ Failed to generate PDF: ${error.message}`
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="h-full flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Campaign Report Export</h2>
        <p className="text-slate-400 text-sm">Download comprehensive campaign details as PDF</p>
      </div>

      {/* Main PDF Download Button */}
      <div className="flex-1 flex items-center justify-center">
        <button
          onClick={downloadCampaignPDF}
          disabled={exporting || !campaignId}
          className="relative group w-full max-w-sm"
        >
          <div className={`absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-300 ${exporting ? 'opacity-50' : ''}`}></div>
          <div className="relative px-8 py-6 bg-slate-900 rounded-lg flex flex-col items-center justify-center gap-4">
            {exporting ? (
              <>
                <Loader size={48} className="text-cyan-400 animate-spin" />
                <p className="text-lg font-bold text-white">Generating PDF...</p>
                <p className="text-sm text-slate-400">Compiling all campaign data</p>
              </>
            ) : (
              <>
                <FileText size={48} className="text-cyan-400" />
                <p className="text-lg font-bold text-white">Download Complete Campaign Report</p>
                <p className="text-sm text-slate-400">All emails, analytics, objections, and details included</p>
                <div className="flex items-center gap-2 mt-2 px-4 py-2 bg-slate-800/50 rounded border border-slate-700">
                  <Download size={16} className="text-purple-400" />
                  <span className="text-sm text-white font-medium">PDF Export</span>
                </div>
              </>
            )}
          </div>
        </button>
      </div>

      {/* Result Message */}
      {exportResult && (
        <div className={`p-4 rounded-lg border flex items-start gap-3 animate-in fade-in ${
          exportResult.success
            ? 'bg-green-500/10 border-green-500/30'
            : 'bg-red-500/10 border-red-500/30'
        }`}>
          {exportResult.success ? (
            <CheckCircle size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className={`text-sm ${exportResult.success ? 'text-green-300' : 'text-red-300'}`}>
              {exportResult.message}
            </p>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm text-blue-300 space-y-2">
        <p><strong>📋 What's Included:</strong></p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Complete campaign overview and metadata</li>
          <li>Company profile and opportunity scoring</li>
          <li>All email sequences with quality scores</li>
          <li>Conversion funnel analysis</li>
          <li>Objection handling summary</li>
          <li>Performance metrics and health score</li>
          <li>Follow-up schedule</li>
        </ul>
      </div>
    </div>
  )
}

export default ExportPanel
