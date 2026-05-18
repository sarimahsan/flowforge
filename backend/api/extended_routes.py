"""
Extended API routes for quality scoring, objections, exports, and lead dashboard
"""
from fastapi import APIRouter, HTTPException, Depends, Body
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Union
from core.database import get_db, init_db
from core.config import settings
from models.database_models import Company, Campaign, Email, Objection, FollowUp
from services.database_service import (
    CompanyService, CampaignService, EmailService, EmailScoreService,
    ObjectionService, FollowUpService, AnalyticsService, ExportService
)
from agents.qa_agent import ConfidenceScoreAgent, ObjectionHandlerAgent
from services.export_service import NotionExportService, GoogleDocsExportService
from api.schema import EmailPriority
from pydantic import BaseModel, Field
from typing import List
import traceback

# ============ REQUEST/RESPONSE MODELS ============
class ReviewEmailRequest(BaseModel):
    email_subject: str
    email_body: str
    company: str
    prospect_info: Optional[Dict] = None

class ReviewEmailResponse(BaseModel):
    overall_score: float
    subject_line_score: float
    body_quality_score: float
    personalization_score: float
    call_to_action_score: float
    issues_found: List[Dict]
    recommendations: List[Dict]

class GenerateObjectionsRequest(BaseModel):
    company: str
    goal: str
    analysis: Optional[Dict] = None

class ObjectionResponse(BaseModel):
    objections: List[Dict]
    generated_at: str

class ExportToDatabaseRequest(BaseModel):
    campaign_id: int
    company: str
    goal: str
    analysis: Dict
    emails: List[Dict]
    objections: List[Dict]

class ExportToNotionRequest(BaseModel):
    campaign_id: int
    notion_database_id: str
    include_emails: bool = True
    include_objections: bool = True

class ExportToGoogleDocsRequest(BaseModel):
    campaign_id: int
    include_emails: bool = True
    include_objections: bool = True

class LeadScoreDashboardResponse(BaseModel):
    companies: List[Dict]
    total_companies: int
    high_priority_count: int
    avg_opportunity_score: float

class CompanySearchRequest(BaseModel):
    query: str

class ScoredCompanyResponse(BaseModel):
    name: str
    industry: Optional[str] = None
    decision_maker: Optional[str] = None
    opportunity_score: float
    fit_score: float
    urgency_level: str

class CompanySearchResponse(BaseModel):
    companies: List[ScoredCompanyResponse]
    query: str
    total_results: int

class FollowUpTimelineRequest(BaseModel):
    campaign_id: int
    industry: str
    initial_send_date: str

class FollowUpTimelineResponse(BaseModel):
    followups: List[Dict]
    scheduled_dates: List[str]

# ============ EXTENDED ROUTER ============
extended_router = APIRouter()

# ============ CAMPAIGN CREATION (SAVES TO DATABASE) ============
class CreateCampaignRequest(BaseModel):
    company: str
    goal: str
    analysis: Optional[Dict] = Field(default=None)
    emails: Optional[Union[Dict, List[Dict]]] = Field(default=None)
    variants: Optional[Union[Dict, List[Dict]]] = Field(default=None)
    follow_up_schedule: Optional[Dict] = Field(default=None)
    
    class Config:
        # Allow extra fields to be ignored
        extra = "allow"

class CreateCampaignResponse(BaseModel):
    campaign_id: int
    company_id: int
    message: str
    emails_saved: int
    objections_generated: int

@extended_router.post("/campaigns/validate-request")
async def validate_campaign_request(request: CreateCampaignRequest):
    """Debug endpoint to validate campaign request before processing"""
    print(f"\n🔍 [VALIDATION] Validating campaign request")
    print(f"🔍 [DEBUG] Company: {request.company}")
    print(f"🔍 [DEBUG] Goal: {request.goal}")
    print(f"🔍 [DEBUG] Analysis: {request.analysis}")
    print(f"🔍 [DEBUG] Emails type: {type(request.emails)}")
    print(f"🔍 [DEBUG] Request validation SUCCESS")
    return {"status": "valid", "message": "Request is valid"}

@extended_router.post("/campaigns/create-from-pipeline", response_model=CreateCampaignResponse)
async def create_campaign_from_pipeline(request: CreateCampaignRequest, db: Session = Depends(get_db)):
    """Create a campaign from pipeline results and save everything to database"""
    try:
        print(f"\n📋 [CAMPAIGN CREATE] Starting campaign creation")
        print(f"📋 [DEBUG] Request received: company={request.company}, goal={request.goal}")
        print(f"📋 [DEBUG] Analysis type: {type(request.analysis)}, Emails type: {type(request.emails)}, Variants type: {type(request.variants)}")
        
        # Normalize inputs - handle None values
        analysis = request.analysis or {}
        emails = request.emails or []
        variants = request.variants or {}
        
        print(f"📋 [DEBUG] After normalization - analysis keys: {list(analysis.keys())}, emails type: {type(emails)}, variants type: {type(variants)}")
        
        # Convert emails dict to list if needed
        emails_list = []
        if isinstance(emails, dict):
            print(f"📋 [DEBUG] Converting emails dict with keys: {list(emails.keys())}")
            # If it's a dict, try to get values that might be email objects
            for key, value in emails.items():
                if isinstance(value, dict):
                    emails_list.append(value)
                elif isinstance(value, list):
                    emails_list.extend(value)
                else:
                    emails_list.append({"subject": str(key), "body": str(value)})
        elif isinstance(emails, list):
            emails_list = emails
            print(f"📋 [DEBUG] Using emails list with {len(emails_list)} items")
        
        # Normalize variants - handle both dict and list
        if isinstance(variants, list):
            print(f"📋 [DEBUG] Variants is a list with {len(variants)} items")
        elif isinstance(variants, dict):
            print(f"📋 [DEBUG] Variants is a dict with keys: {list(variants.keys())}")
        
        # Ensure we have at least some emails
        if not emails_list:
            print(f"📋 [DEBUG] No emails provided, using fallback email")
            emails_list = [{"subject": "Initial Email", "body": "Hello, interested in discussing partnership opportunities."}]

        print(f"📋 [DEBUG] Final emails_list has {len(emails_list)} emails")

        # 1. Create or get company
        print(f"📋 [DEBUG] Creating/fetching company: {request.company}")
        company = CompanyService.get_company_by_name(db, request.company)
        if not company:
            print(f"📋 [DEBUG] Company not found, creating new company")
            company = CompanyService.create_company(
                db,
                name=request.company,
                industry=analysis.get("industry", "Unknown"),
                opportunity_score=analysis.get("fit_score", 50),
                urgency_level=analysis.get("urgency", "medium"),
                fit_score=analysis.get("fit_score", 50),
                decision_maker=analysis.get("decision_maker", "Unknown")
            )
            print(f"📋 [DEBUG] Created company with ID: {company.id}")
        else:
            print(f"📋 [DEBUG] Found existing company with ID: {company.id}")

        # 2. Create campaign
        print(f"📋 [DEBUG] Creating campaign for company {request.company}")
        campaign = CampaignService.create_campaign(
            db,
            company_id=company.id,
            name=f"{request.company} Campaign",
            goal=request.goal,
            analysis_data=analysis
        )
        print(f"📋 [DEBUG] Created campaign with ID: {campaign.id}")

        # 3. Score emails and save to database
        print(f"📋 [DEBUG] Initializing QA agent for email scoring")
        qa_agent = ConfidenceScoreAgent(groq_api_key=settings.GROQ_API_KEY)
        emails_saved = 0
        first_email_id = None
        
        for idx, email_data in enumerate(emails_list, 1):
            print(f"📋 [DEBUG] Processing email {idx}/{len(emails_list)}")
            # Score the email
            score_result = qa_agent.review_email(
                email_subject=email_data.get("subject", ""),
                email_body=email_data.get("body", ""),
                company=request.company,
                prospect_info={}
            )
            print(f"📋 [DEBUG] Email {idx} scored: {score_result.get('overall_score', 0)}")

            # Create email record
            email = EmailService.create_email(
                db,
                company_id=company.id,
                campaign_id=campaign.id,
                subject=email_data.get("subject", ""),
                body=email_data.get("body", ""),
                sequence_number=idx,
                variant_type=email_data.get("type", "balanced"),
                personalization_score=score_result.get("personalization_score", 0),
                confidence_score=score_result.get("overall_score", 0)
            )

            # Save email score
            if idx == 1:
                first_email_id = email.id
                
            EmailScoreService.create_email_score(
                db,
                email_id=email.id,
                overall_score=score_result.get("overall_score", 0),
                scores_dict={
                    "subject_line_score": score_result.get("subject_line_score", 0),
                    "body_quality_score": score_result.get("body_quality_score", 0),
                    "personalization_score": score_result.get("personalization_score", 0),
                    "call_to_action_score": score_result.get("call_to_action_score", 0)
                },
                feedback_dict={},
                recommendations=score_result.get("recommendations", []),
                issues_found=score_result.get("issues_found", [])
            )

            emails_saved += 1

        # 4. Generate and save objections
        objection_agent = ObjectionHandlerAgent(groq_api_key=settings.GROQ_API_KEY)
        objections_response = objection_agent.generate_objection_responses(
            company=request.company,
            goal=request.goal,
            analysis=analysis
        )

        objections_generated = 0
        if objections_response and isinstance(objections_response, list) and len(objections_response) > 0:
            saved_objections = ObjectionService.create_objections(db, campaign.id, objections_response)
            objections_generated = len(saved_objections)

        # 5. Save follow-up schedule if provided
        if request.follow_up_schedule and isinstance(request.analysis, dict):
            industry = request.analysis.get("industry", "default").lower()
            schedule_days = [1, 4, 8, 15]  # Default SaaS schedule
            industry_schedules = {
                "saas": [1, 4, 8, 15],
                "financial": [1, 3, 7, 14],
                "manufacturing": [1, 5, 10, 20],
                "healthcare": [1, 3, 7, 14],
                "retail": [1, 2, 5, 10]
            }
            schedule_days = industry_schedules.get(industry, [1, 4, 8, 15])

            now = datetime.utcnow()
            for idx, days_offset in enumerate(schedule_days, 1):
                send_date = now + timedelta(days=days_offset)
                if first_email_id is not None:
                    FollowUpService.create_followup(
                        db,
                        campaign.id,
                        first_email_id,  # email_id
                        sequence_day=idx,
                        suggested_send_time=send_date,
                        industry=industry,
                        rationale=f"Day {days_offset} follow-up - {industry} best practice"
                    )

        return CreateCampaignResponse(
            campaign_id=campaign.id,
            company_id=company.id,
            message="✅ Campaign saved successfully",
            emails_saved=emails_saved,
            objections_generated=objections_generated
        )

    except Exception as e:
        error_trace = traceback.format_exc()
        error_msg = str(e)
        print(f"\n❌ [CAMPAIGN CREATE] ERROR: {error_msg}")
        print(f"❌ [TRACEBACK]\n{error_trace}")
        print(f"❌ [END TRACEBACK]\n")
        raise HTTPException(status_code=500, detail=f"Campaign creation failed: {error_msg}")

# ============ QUALITY ASSURANCE ENDPOINTS ============
@extended_router.post("/quality/review-email", response_model=ReviewEmailResponse)
async def review_email_quality(request: ReviewEmailRequest, db: Session = Depends(get_db)):
    """Review an email and provide quality scores"""
    try:
        qa_agent = ConfidenceScoreAgent(groq_api_key=settings.GROQ_API_KEY)
        
        result = qa_agent.review_email(
            email_subject=request.email_subject,
            email_body=request.email_body,
            company=request.company,
            prospect_info=request.prospect_info
        )
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@extended_router.get("/quality/score-email-sequence")
async def score_email_sequence(campaign_id: int, db: Session = Depends(get_db)):
    """Get email quality scores from database for a campaign"""
    try:
        # Get all emails for this campaign with their scores
        emails = EmailService.get_emails_by_campaign(db, campaign_id)
        
        if not emails:
            return {
                "total_emails": 0,
                "average_confidence_score": 0,
                "emails": []
            }

        scored_emails = []
        total_score = 0

        for email in emails:
            # Get the score for this email
            score = EmailScoreService.get_email_score(db, email.id)
            
            email_data = {
                "id": email.id,
                "subject": email.subject,
                "body": email.body,
                "confidence_score": email.confidence_score or 0,
                "personalization_score": email.personalization_score or 0,
                "feedback": {
                    "overall_score": score.overall_score if score else 0,
                    "subject_line_score": score.subject_line_score if score else 0,
                    "body_quality_score": score.body_quality_score if score else 0,
                    "personalization_score": score.personalization_score if score else 0,
                    "call_to_action_score": score.call_to_action_score if score else 0,
                    "issues_found": score.issues_found if score else [],
                    "recommendations": score.recommendations if score else []
                }
            }
            
            scored_emails.append(email_data)
            total_score += email.confidence_score or 0

        avg_score = total_score / len(emails) if emails else 0

        return {
            "total_emails": len(scored_emails),
            "average_confidence_score": avg_score,
            "emails": scored_emails
        }
    except Exception as e:
        print(f"Error scoring emails: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============ OBJECTION HANDLER ENDPOINTS ============
@extended_router.get("/objections/for-campaign/{campaign_id}")
async def get_campaign_objections_for_ui(campaign_id: int, db: Session = Depends(get_db)):
    """Get objections for a campaign from database"""
    try:
        objections = ObjectionService.get_objections_by_campaign(db, campaign_id)
        
        return {
            "campaign_id": campaign_id,
            "total_objections": len(objections),
            "objections": [
                {
                    "id": obj.id,
                    "objection": obj.objection_text,
                    "likelihood": obj.likelihood_percentage,
                    "response": obj.response_text,
                    "alternatives": obj.alternative_responses or [],
                    "approaches": ["empathetic", "logical", "value-focused"]
                }
                for obj in objections
            ]
        }
    except Exception as e:
        print(f"Error getting objections: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@extended_router.post("/objections/generate", response_model=ObjectionResponse)
async def generate_objections(request: GenerateObjectionsRequest, 
                             db: Session = Depends(get_db)):
    """Generate likely objections and pre-written responses"""
    try:
        objection_agent = ObjectionHandlerAgent(groq_api_key=settings.GROQ_API_KEY)
        
        objections = objection_agent.generate_objection_responses(
            company=request.company,
            goal=request.goal,
            analysis=request.analysis
        )
        
        return ObjectionResponse(
            objections=objections,
            generated_at=datetime.utcnow().isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@extended_router.post("/objections/save-for-campaign")
async def save_objections_to_campaign(
    campaign_id: int,
    objections: List[Dict],
    db: Session = Depends(get_db)
):
    """Save generated objections to database for a campaign"""
    try:
        campaign = CampaignService.get_campaign_by_id(db, campaign_id)
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        saved_objections = ObjectionService.create_objections(db, campaign_id, objections)
        
        return {
            "campaign_id": campaign_id,
            "objections_saved": len(saved_objections),
            "objections": [
                {
                    "id": obj.id,
                    "objection": obj.objection_text,
                    "likelihood": obj.likelihood_percentage,
                    "response": obj.response_text
                }
                for obj in saved_objections
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@extended_router.get("/objections/campaign/{campaign_id}")
async def get_campaign_objections(campaign_id: int, db: Session = Depends(get_db)):
    """Get all objections for a campaign"""
    try:
        objections = ObjectionService.get_objections_by_campaign(db, campaign_id)
        
        return {
            "campaign_id": campaign_id,
            "total_objections": len(objections),
            "objections": [
                {
                    "id": obj.id,
                    "objection": obj.objection_text,
                    "likelihood": obj.likelihood_percentage,
                    "response": obj.response_text,
                    "alternatives": obj.alternative_responses or []
                }
                for obj in objections
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ LEAD SCORING DASHBOARD ============
@extended_router.get("/dashboard/leads", response_model=LeadScoreDashboardResponse)
async def get_lead_dashboard(db: Session = Depends(get_db)):
    """Get lead scoring dashboard with all companies ranked by opportunity"""
    try:
        companies = CompanyService.get_companies_by_opportunity_score(db, limit=100)
        
        high_priority = [c for c in companies if c.urgency_level == "critical"]
        avg_score = sum(c.opportunity_score for c in companies) / len(companies) if companies else 0
        
        return LeadScoreDashboardResponse(
            companies=[
                {
                    "id": c.id,
                    "name": c.name,
                    "industry": c.industry,
                    "opportunity_score": c.opportunity_score,
                    "urgency_level": c.urgency_level,
                    "color_code": _get_urgency_color(c.urgency_level),
                    "fit_score": c.fit_score,
                    "decision_maker": c.decision_maker
                }
                for c in companies
            ],
            total_companies=len(companies),
            high_priority_count=len(high_priority),
            avg_opportunity_score=avg_score
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def _get_urgency_color(urgency: str) -> str:
    """Map urgency level to color code"""
    colors = {
        "critical": "#FF0000",  # Red
        "high": "#FFA500",       # Orange
        "medium": "#FFFF00",     # Yellow
        "low": "#00FF00"         # Green
    }
    return colors.get(urgency, "#808080")  # Default gray

@extended_router.put("/dashboard/update-lead-score")
async def update_lead_score(
    company_id: int,
    opportunity_score: float,
    urgency_level: str,
    db: Session = Depends(get_db)
):
    """Update scores for a company in the dashboard"""
    try:
        company = CompanyService.update_opportunity_score(db, company_id, opportunity_score)
        company = CompanyService.update_urgency_level(db, company_id, urgency_level)
        
        return {
            "company_id": company_id,
            "opportunity_score": company.opportunity_score,
            "urgency_level": company.urgency_level,
            "message": "✅ Lead score updated"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ FOLLOW-UP TIMELINE ============
@extended_router.post("/followup/generate-timeline")
async def generate_followup_timeline(
    request: FollowUpTimelineRequest,
    db: Session = Depends(get_db)
):
    """Generate follow-up timeline based on industry best practices"""
    try:
        # Industry-based follow-up schedules
        industry_schedules = {
            "saas": [1, 4, 8, 15],
            "financial": [1, 3, 7, 14],
            "manufacturing": [1, 5, 10, 20],
            "healthcare": [1, 3, 7, 14],
            "retail": [1, 2, 5, 10],
            "default": [1, 4, 8, 15]
        }
        
        schedule = industry_schedules.get(request.industry.lower(), industry_schedules["default"])
        initial_date = datetime.fromisoformat(request.initial_send_date)
        
        followups = []
        for idx, days_offset in enumerate(schedule, 1):
            send_date = initial_date + timedelta(days=days_offset)
            
            followup = FollowUpService.create_followup(
                db,
                request.campaign_id,
                0,  # email_id placeholder
                sequence_day=idx,
                suggested_send_time=send_date,
                industry=request.industry,
                rationale=_get_followup_rationale(idx, request.industry)
            )
            
            followups.append({
                "id": followup.id,
                "sequence": idx,
                "suggested_date": send_date.isoformat(),
                "days_from_initial": days_offset,
                "rationale": followup.rationale
            })
        
        return {
            "campaign_id": request.campaign_id,
            "industry": request.industry,
            "initial_send_date": request.initial_send_date,
            "followups": followups,
            "total_followups": len(followups)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def _get_followup_rationale(sequence: int, industry: str) -> str:
    """Get rationale for follow-up timing"""
    rationales = {
        1: "Initial outreach",
        2: "Re-engagement after initial contact",
        3: "Persistence window (peak response time)",
        4: "Final push before moving on"
    }
    return rationales.get(sequence, f"Follow-up {sequence}")

@extended_router.post("/followup/schedule-to-calendar")
async def schedule_followups_to_calendar(
    campaign_id: int,
    followup_ids: List[int],
    db: Session = Depends(get_db)
):
    """Schedule follow-ups to Google Calendar"""
    try:
        from services.calendar_service import CalendarService
        
        calendar = CalendarService()
        if not calendar.authenticate():
            raise HTTPException(status_code=401, detail="Calendar authentication failed")
        
        scheduled = []
        for followup_id in followup_ids:
            followup = db.query(FollowUp).filter(FollowUp.id == followup_id).first()
            if followup:
                event_id = calendar.schedule_followup_email(
                    campaign_id=campaign_id,
                    followup_date=followup.suggested_send_time,
                    description=f"Follow-up {followup.sequence_day}"
                )
                
                FollowUpService.schedule_followup(db, followup_id, event_id)
                scheduled.append({
                    "followup_id": followup_id,
                    "calendar_event_id": event_id,
                    "status": "scheduled"
                })
        
        return {
            "campaign_id": campaign_id,
            "scheduled_count": len(scheduled),
            "scheduled_followups": scheduled
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ EXPORT ENDPOINTS ============
@extended_router.post("/export/save-to-database")
async def save_campaign_to_database(
    request: ExportToDatabaseRequest,
    db: Session = Depends(get_db)
):
    """Save complete campaign data to SQL database"""
    try:
        # Create or get company
        company = CompanyService.get_company_by_name(db, request.company)
        if not company:
            company = CompanyService.create_company(
                db,
                name=request.company,
                research_data=request.analysis
            )
        
        # Create campaign
        campaign = CampaignService.create_campaign(
            db,
            company_id=company.id,
            name=f"{request.company} Campaign",
            goal=request.goal,
            analysis_data=request.analysis
        )
        
        # Save emails
        for idx, email_data in enumerate(request.emails, 1):
            EmailService.create_email(
                db,
                company_id=company.id,
                campaign_id=campaign.id,
                subject=email_data.get("subject"),
                body=email_data.get("body"),
                sequence_number=idx,
                confidence_score=email_data.get("confidence_score"),
                personalization_score=email_data.get("personalization_score"),
                quality_feedback=email_data.get("feedback")
            )
        
        # Save objections
        if request.objections:
            ObjectionService.create_objections(db, campaign.id, request.objections)
        
        return {
            "status": "saved",
            "company_id": company.id,
            "campaign_id": campaign.id,
            "emails_saved": len(request.emails),
            "objections_saved": len(request.objections),
            "message": "✅ Campaign data saved to database"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@extended_router.post("/export/to-notion")
async def export_to_notion(
    request: ExportToNotionRequest,
    db: Session = Depends(get_db)
):
    """Export campaign to Notion"""
    try:
        if not settings.NOTION_API_KEY:
            raise HTTPException(status_code=400, detail="Notion API key not configured. Set NOTION_API_KEY in environment variables.")
        
        notion = NotionExportService(notion_api_key=settings.NOTION_API_KEY)
        if not notion.client:
            raise HTTPException(status_code=400, detail="Failed to initialize Notion client")
        
        campaign = db.query(Campaign).filter(Campaign.id == request.campaign_id).first()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        # Get campaign data
        company = campaign.company
        emails = db.query(Email).filter(Email.campaign_id == request.campaign_id).all()
        objections = db.query(Objection).filter(Objection.campaign_id == request.campaign_id).all()
        
        # Create Notion page
        campaign_data = {
            "company": company.name,
            "goal": campaign.goal,
            "opportunity_score": company.opportunity_score,
            "status": campaign.status
        }
        
        page_id = notion.create_campaign_page(request.notion_database_id, campaign_data)
        
        if not page_id:
            raise HTTPException(status_code=500, detail="Failed to create Notion page")
        
        # Add email sequence
        if request.include_emails:
            emails_data = [
                {
                    "subject": email.subject,
                    "body": email.body,
                    "confidence_score": email.confidence_score or 0,
                    "personalization_score": email.personalization_score or 0
                }
                for email in emails
            ]
            notion.add_email_sequence_to_page(page_id, emails_data)
        
        # Add objections
        if request.include_objections:
            objections_data = [
                {
                    "objection": obj.objection_text,
                    "likelihood_percentage": obj.likelihood_percentage,
                    "response": obj.response_text
                }
                for obj in objections
            ]
            notion.add_objections_to_page(page_id, objections_data)
        
        return {
            "status": "exported",
            "notion_page_id": page_id,
            "campaign_id": request.campaign_id,
            "message": "✅ Campaign exported to Notion"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@extended_router.post("/export/to-google-docs")
async def export_to_google_docs(
    request: ExportToGoogleDocsRequest,
    db: Session = Depends(get_db)
):
    """Export campaign to Google Docs"""
    try:
        google_docs = GoogleDocsExportService()
        if not google_docs.service:
            raise HTTPException(status_code=400, detail="Google Docs service not configured")
        
        campaign = CampaignService.get_campaign_by_id(db, request.campaign_id)
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        company = campaign.company
        emails = CampaignService.get_campaigns_by_company(db, company.id)  # Placeholder
        objections = ObjectionService.get_objections_by_campaign(db, request.campaign_id)
        
        # Create Google Doc
        campaign_data = {
            "company": company.name,
            "goal": campaign.goal,
            "opportunity_score": company.opportunity_score,
            "status": campaign.status
        }
        
        doc_id = google_docs.create_campaign_document(campaign_data)
        
        if not doc_id:
            raise HTTPException(status_code=500, detail="Failed to create Google Doc")
        
        # Add email sequence
        if request.include_emails:
            emails_data = [
                {
                    "subject": email.subject,
                    "body": email.body,
                    "confidence_score": email.confidence_score or 0,
                    "personalization_score": email.personalization_score or 0
                }
                for email in emails
            ]
            google_docs.add_email_sequence(doc_id, emails_data)
        
        # Add objections
        if request.include_objections:
            objections_data = [
                {
                    "objection": obj.objection_text,
                    "likelihood_percentage": obj.likelihood_percentage,
                    "response": obj.response_text
                }
                for obj in objections
            ]
            google_docs.add_objections_guide(doc_id, objections_data)
        
        return {
            "status": "exported",
            "google_doc_id": doc_id,
            "campaign_id": request.campaign_id,
            "google_docs_url": f"https://docs.google.com/document/d/{doc_id}/edit",
            "message": "✅ Campaign exported to Google Docs"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ LEAD SEARCH AND SCORING ============
@extended_router.post("/companies/search-web", response_model=CompanySearchResponse)
async def search_companies_web(request: CompanySearchRequest):
    """
    Search the web for COMPETITOR and SIMILAR companies at all market levels (low-end, mid-market, enterprise).
    Returns a diverse list of companies with AI-generated scores for opportunity and fit.
    """
    try:
        from tavily import TavilyClient
        from langchain_groq import ChatGroq
        from core.config import settings
        
        # Initialize clients
        tavily_client = TavilyClient(api_key=settings.TAVILY_API_KEY)
        llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=settings.GROQ_API_KEY
        )
        
        # Search for COMPETITORS and SIMILAR companies, not just the search term
        search_queries = [
            f"{request.query} competitors alternatives similar",
            f"companies like {request.query}",
            f"{request.query} competitors in market",
        ]
        
        companies_data = []
        
        for query in search_queries:
            try:
                search_results = tavily_client.search(
                    query=query,
                    max_results=3
                )
                if search_results and search_results.get("results"):
                    for result in search_results["results"]:
                        companies_data.append({
                            "name": result.get("title", "Unknown Company"),
                            "info": result.get("content", ""),
                            "url": result.get("url", "")
                        })
            except Exception as e:
                print(f"⚠️ Tavily search failed for '{query}': {e}")
                continue
        
        # Remove duplicates
        seen = set()
        unique_companies = []
        for company in companies_data:
            name_lower = company["name"].lower()
            if name_lower not in seen:
                seen.add(name_lower)
                unique_companies.append(company)
        
        companies_data = unique_companies[:5]  # Limit to 5
        
        # If Tavily returns nothing, use LLM to generate competitors
        if not companies_data:
            llm_response = llm.invoke(f"""
Generate 5 COMPETITOR companies that compete with or are similar to: "{request.query}"
Include companies at DIFFERENT market levels:
- 2x low-end/startup competitors  
- 2x mid-market competitors
- 1x enterprise competitor

For each company, provide:
1. Company name (real companies only)
2. Brief description (1 sentence)
3. Market level (low-end, mid-market, enterprise)

Format as JSON array with 'name', 'info', and 'market_level' fields.
Return ONLY valid JSON, no markdown.
""")
            import json
            try:
                companies_data = json.loads(llm_response.content)
            except:
                companies_data = []
        
        # Score companies using LLM - considering all market levels
        scored_companies = []
        
        for company in companies_data[:5]:
            company_name = company.get('name', 'Unknown')
            company_info = company.get('info', '')
            market_level = company.get('market_level', 'mid-market')
            
            # Generate scores
            scoring_prompt = f"""
Score this company for B2B sales outreach:
Company: {company_name}
Market Level: {market_level}
Info: {company_info}

Provide a JSON response with:
- opportunity_score (0-100): How much potential revenue/opportunity? (High for low-end growth potential, high for enterprise deals)
- fit_score (0-100): How well does it fit AI/tech solutions?
- urgency_level ("high", "medium", "low"): How urgent might their AI/tech needs be?
- industry (string): What industry?
- decision_maker (string): Likely title of decision maker?

Return ONLY valid JSON.
"""
            try:
                score_response = llm.invoke(scoring_prompt)
                import json
                scores = json.loads(score_response.content)
            except:
                # Default scores if parsing fails - vary based on market level
                if market_level == "enterprise":
                    default_opp = 85
                    default_fit = 75
                elif market_level == "mid-market":
                    default_opp = 70
                    default_fit = 70
                else:  # low-end/startup
                    default_opp = 60
                    default_fit = 65
                
                scores = {
                    "opportunity_score": default_opp,
                    "fit_score": default_fit,
                    "urgency_level": "medium" if market_level == "enterprise" else "high" if market_level == "low-end" else "medium",
                    "industry": "Technology",
                    "decision_maker": "CTO" if market_level == "enterprise" else "CEO" if market_level == "low-end" else "VP of Technology"
                }
            
            scored_companies.append({
                "name": company_name,
                "industry": scores.get("industry"),
                "decision_maker": scores.get("decision_maker"),
                "opportunity_score": scores.get("opportunity_score", 50),
                "fit_score": scores.get("fit_score", 50),
                "urgency_level": scores.get("urgency_level", "medium")
            })
        
        return {
            "companies": scored_companies,
            "query": request.query,
            "total_results": len(scored_companies)
        }
        
    except Exception as e:
        print(f"❌ Company search error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to search companies: {str(e)}"
        )

# ============ CAMPAIGNS HISTORY ENDPOINTS ============
@extended_router.get("/campaigns/list-all")
async def list_all_campaigns(db: Session = Depends(get_db)):
    """Get all campaigns with company and email data for history view"""
    try:
        campaigns = db.query(Campaign).order_by(Campaign.created_at.desc()).all()
        
        campaigns_data = []
        for campaign in campaigns:
            # Get company info
            company = campaign.company
            
            # Get emails
            emails = db.query(Email).filter(Email.campaign_id == campaign.id).all()
            emails_data = [
                {
                    "id": email.id,
                    "subject": email.subject,
                    "body": email.body,
                    "type": email.variant_type or "balanced",
                    "sequence_number": email.sequence_number
                }
                for email in emails
            ]
            
            # Get objections
            objections = db.query(Objection).filter(Objection.campaign_id == campaign.id).all()
            objections_data = [
                {
                    "id": obj.id,
                    "objection": obj.objection_text,
                    "response": obj.response_text
                }
                for obj in objections
            ]
            
            campaigns_data.append({
                "campaign_id": campaign.id,
                "company_id": company.id,
                "company_name": company.name,
                "campaign_name": campaign.name,
                "goal": campaign.goal,
                "status": campaign.status,
                "created_at": campaign.created_at.isoformat(),
                "updated_at": campaign.updated_at.isoformat(),
                "analysis": campaign.analysis_data,
                "emails": emails_data,
                "objections": objections_data,
                "emails_count": len(emails_data),
                "objections_count": len(objections_data)
            })
        
        return {
            "campaigns": campaigns_data,
            "total_campaigns": len(campaigns_data)
        }
    
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Error fetching campaigns: {error_msg}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch campaigns: {error_msg}")

@extended_router.get("/campaigns/{campaign_id}/details")
async def get_campaign_details(campaign_id: int, db: Session = Depends(get_db)):
    """Get full details of a specific campaign for loading"""
    try:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        
        if not campaign:
            raise HTTPException(status_code=404, detail=f"Campaign {campaign_id} not found")
        
        # Get company info
        company = campaign.company
        
        # Get emails
        emails = db.query(Email).filter(Email.campaign_id == campaign.id).order_by(Email.sequence_number).all()
        emails_data = [
            {
                "id": email.id,
                "subject": email.subject,
                "body": email.body,
                "type": email.variant_type or "balanced",
                "sequence_number": email.sequence_number,
                "to_email": email.to_email,
                "status": email.status or "draft",
                "sent_at": email.sent_at.isoformat() if email.sent_at else None,
                "opened_at": email.opened_at.isoformat() if email.opened_at else None,
                "open_count": email.open_count or 0
            }
            for email in emails
        ]
        
        # Get objections
        objections = db.query(Objection).filter(Objection.campaign_id == campaign.id).all()
        objections_data = [
            {
                "id": obj.id,
                "objection": obj.objection_text,
                "response": obj.response_text
            }
            for obj in objections
        ]
        
        # Get follow-ups
        followups = db.query(FollowUp).filter(FollowUp.campaign_id == campaign.id).all()
        followups_data = [
            {
                "id": followup.id,
                "sequence_day": followup.sequence_day,
                "suggested_send_time": followup.suggested_send_time.isoformat() if followup.suggested_send_time else None,
                "industry": followup.industry
            }
            for followup in followups
        ]
        
        return {
            "campaign_id": campaign.id,
            "company_id": company.id,
            "company": company.name,
            "company_name": company.name,
            "campaign_name": campaign.name,
            "goal": campaign.goal,
            "status": campaign.status,
            "created_at": campaign.created_at.isoformat(),
            "updated_at": campaign.updated_at.isoformat(),
            "analysis": campaign.analysis_data or {},
            "emails": emails_data,
            "objections": objections_data,
            "follow_up_schedule": {
                "followups": followups_data
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Error fetching campaign {campaign_id}: {error_msg}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch campaign: {error_msg}")

@extended_router.delete("/campaigns/{campaign_id}/delete")
async def delete_campaign(campaign_id: int, db: Session = Depends(get_db)):
    """Delete a campaign and all its related data"""
    try:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        
        if not campaign:
            raise HTTPException(status_code=404, detail=f"Campaign {campaign_id} not found")
        
        company_name = campaign.company.name if campaign.company else "Unknown"
        
        # Delete all related emails
        db.query(Email).filter(Email.campaign_id == campaign_id).delete()
        
        # Delete all related objections
        db.query(Objection).filter(Objection.campaign_id == campaign_id).delete()
        
        # Delete all related follow-ups
        db.query(FollowUp).filter(FollowUp.campaign_id == campaign_id).delete()
        
        # Delete the campaign itself
        db.delete(campaign)
        db.commit()
        
        return {
            "status": "success",
            "message": f"Campaign '{campaign.name}' for {company_name} has been deleted",
            "campaign_id": campaign_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        error_msg = str(e)
        print(f"❌ Error deleting campaign {campaign_id}: {error_msg}")
        raise HTTPException(status_code=500, detail=f"Failed to delete campaign: {error_msg}")

@extended_router.put("/emails/{email_id}/send")
async def send_email(email_id: int, body: dict = Body(...), db: Session = Depends(get_db)):
    """Mark an email as sent and update recipient"""
    try:
        print(f"📧 send_email called with email_id={email_id}, body={body}")
        
        recipient = body.get("recipient") if isinstance(body, dict) else None
        
        if not recipient or not recipient.strip():
            print(f"❌ No recipient provided in body: {body}")
            raise HTTPException(status_code=400, detail="Recipient email is required")
        
        print(f"🔍 Looking up email {email_id}")
        email = db.query(Email).filter(Email.id == email_id).first()
        
        if not email:
            print(f"❌ Email {email_id} not found in database")
            raise HTTPException(status_code=404, detail=f"Email {email_id} not found")
        
        # Update email status to sent
        print(f"💾 Updating email {email_id}: status='sent', to_email='{recipient}'")
        email.status = "sent"
        email.to_email = recipient
        email.sent_at = datetime.utcnow()
        
        # Explicitly mark for update
        db.add(email)
        db.commit()
        db.refresh(email)
        
        print(f"✅ Email {email_id} successfully sent to {recipient}")
        print(f"   Updated in DB: status={email.status}, to_email={email.to_email}, sent_at={email.sent_at}")
        
        return {
            "status": "success",
            "message": f"Email sent to {recipient}",
            "email_id": email_id,
            "sent_at": email.sent_at.isoformat(),
            "new_status": email.status
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        error_msg = str(e)
        print(f"❌ Error sending email {email_id}: {error_msg}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {error_msg}")

@extended_router.get("/campaigns/{campaign_id}/analytics")
async def get_campaign_analytics(campaign_id: int, db: Session = Depends(get_db)):
    """Get comprehensive analytics for a campaign"""
    try:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        company = campaign.company
        emails = db.query(Email).filter(Email.campaign_id == campaign_id).all()
        objections = db.query(Objection).filter(Objection.campaign_id == campaign_id).all()
        followups = db.query(FollowUp).filter(FollowUp.campaign_id == campaign_id).all()
        
        # Calculate email statistics
        total_emails = len(emails)
        drafted_emails = len([e for e in emails if e.status == "draft"])
        sent_emails = len([e for e in emails if e.status == "sent"])
        opened_emails = len([e for e in emails if e.status == "opened"])
        failed_emails = len([e for e in emails if e.status == "failed"])
        
        avg_confidence = sum(e.confidence_score or 0 for e in emails) / total_emails if total_emails else 0
        avg_personalization = sum(e.personalization_score or 0 for e in emails) / total_emails if total_emails else 0
        
        # Email quality distribution
        quality_scores = {
            "excellent": len([e for e in emails if (e.confidence_score or 0) >= 80]),
            "good": len([e for e in emails if 60 <= (e.confidence_score or 0) < 80]),
            "fair": len([e for e in emails if 40 <= (e.confidence_score or 0) < 60]),
            "poor": len([e for e in emails if (e.confidence_score or 0) < 40])
        }
        
        # Calculate open rate
        open_rate = (opened_emails / sent_emails * 100) if sent_emails > 0 else 0
        
        # Response rate from objections
        objection_count = len(objections)
        
        # Timeline data for chart
        followup_timeline = [
            {
                "day": f.sequence_day,
                "date": f.suggested_send_time.isoformat() if f.suggested_send_time else None,
                "rationale": f.rationale or f"Follow-up {f.sequence_day}"
            }
            for f in sorted(followups, key=lambda x: x.sequence_day)
        ]
        
        # Email type breakdown
        email_types = {}
        for email in emails:
            email_type = email.variant_type or "balanced"
            if email_type not in email_types:
                email_types[email_type] = 0
            email_types[email_type] += 1
        
        # Email performance by sequence
        email_performance = []
        for email in sorted(emails, key=lambda x: x.sequence_number or 0):
            email_performance.append({
                "sequence": email.sequence_number or 0,
                "subject": email.subject[:50] + "..." if len(email.subject or "") > 50 else email.subject,
                "status": email.status,
                "confidence": email.confidence_score or 0,
                "personalization": email.personalization_score or 0
            })
        
        # Conversion funnel
        funnel = [
            {"stage": "Created", "count": total_emails, "percentage": 100},
            {"stage": "Sent", "count": sent_emails, "percentage": round((sent_emails / total_emails * 100) if total_emails else 0, 2)},
            {"stage": "Opened", "count": opened_emails, "percentage": round((opened_emails / sent_emails * 100) if sent_emails else 0, 2)},
            {"stage": "Replied", "count": objection_count, "percentage": round((objection_count / opened_emails * 100) if opened_emails else 0, 2)}
        ]
        
        # Objection handling metrics
        objection_responses = []
        for obj in objections[:5]:  # Top 5 objections
            objection_responses.append({
                "objection": obj.objection_text[:60] + "..." if len(obj.objection_text or "") > 60 else obj.objection_text,
                "response_quality": 85.0 if obj.response_approach == "empathetic" else 80.0 if obj.response_approach == "logical" else 75.0
            })
        
        # Company profile metrics
        company_metrics = {
            "name": company.name,
            "industry": company.industry or "Unknown",
            "size": company.size or "Unknown",
            "location": company.location or "Unknown",
            "opportunity_score": company.opportunity_score,
            "fit_score": company.fit_score,
            "urgency": company.urgency_level,
            "decision_maker": company.decision_maker or "Not specified",
            "budget_indicator": "High" if company.opportunity_score > 75 else "Medium" if company.opportunity_score > 50 else "Low"
        }
        
        # Performance indicators
        performance_indicators = {
            "email_quality": round(avg_confidence, 2),
            "personalization_level": round(avg_personalization, 2),
            "engagement_potential": round(open_rate, 2),
            "objection_coverage": round((objection_count / max(1, sent_emails)) * 100, 2),
            "follow_up_readiness": len(followups),
            "campaign_momentum": "Strong" if open_rate > 50 else "Moderate" if open_rate > 25 else "Building"
        }
        
        # Overall health score
        health_score = round((avg_confidence * 0.3 + avg_personalization * 0.25 + (100 - open_rate) * 0.2 + (objection_count / max(1, sent_emails)) * 100 * 0.25), 2)
        
        return {
            "campaign_id": campaign_id,
            "company_name": company.name,
            "campaign_name": campaign.name,
            "status": campaign.status,
            "created_at": campaign.created_at.isoformat(),
            "updated_at": campaign.updated_at.isoformat(),
            
            # Email metrics
            "emails": {
                "total": total_emails,
                "drafted": drafted_emails,
                "sent": sent_emails,
                "opened": opened_emails,
                "failed": failed_emails,
                "open_rate": round(open_rate, 2),
                "avg_confidence_score": round(avg_confidence, 2),
                "avg_personalization_score": round(avg_personalization, 2)
            },
            
            # Email types breakdown
            "email_types": email_types,
            
            # Email performance sequence
            "email_performance": email_performance,
            
            # Quality distribution
            "quality_distribution": quality_scores,
            
            # Conversion funnel
            "funnel": funnel,
            
            # Objection metrics
            "objections": {
                "total": objection_count,
                "covered_percentage": round((objection_count / max(1, total_emails)) * 100, 2),
                "top_objections": objection_responses
            },
            
            # Follow-up metrics
            "followups": {
                "total": len(followups),
                "timeline": followup_timeline
            },
            
            # Company profile
            "company": company_metrics,
            
            # Performance indicators
            "performance": performance_indicators,
            
            # Opportunity metrics
            "opportunity": {
                "company_opportunity_score": company.opportunity_score,
                "fit_score": company.fit_score,
                "urgency_level": company.urgency_level,
                "decision_maker": company.decision_maker
            },
            
            # Overall health score
            "health_score": health_score,
            
            # Summary
            "summary": {
                "total_actions": total_emails + objection_count + len(followups),
                "engagement_rate": round(open_rate, 2),
                "response_rate": round((objection_count / max(1, sent_emails)) * 100, 2),
                "campaign_status": "Active" if campaign.status == "draft" else campaign.status
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching campaign analytics: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to fetch analytics: {str(e)}")


