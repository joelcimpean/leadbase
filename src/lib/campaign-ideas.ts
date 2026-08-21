export type CampaignIdea = {
    id: string;
    name: string;
    industry: string;
    category: string;
    description: string;
    fit: "Strong fit" | "Good fit";
  
    companySizePreference: string;
    targetRoles: string;
  
    researchCriteria: string;
    websiteCriteria: string;
  
    outreachAngle: string;
    emailTone: string;
  
    followUpDays: number;
  };
  
  export const CAMPAIGN_IDEAS: CampaignIdea[] = [
    {
      id: "photovoltaik",
      name: "Photovoltaik / Solar",
      industry: "Photovoltaik / Solar",
      category: "Energy",
      fit: "Strong fit",
  
      description:
        "Visual, high-value projects with strong trust requirements and many regional providers competing for enquiries.",
  
      companySizePreference:
        "2–30 employees",
  
      targetRoles:
        "Owner, Managing Director, Geschäftsführer, Inhaber",
  
      researchCriteria:
        "Active regional photovoltaic or solar company with visible projects, installations or customer references. Prefer established businesses that appear to actively acquire residential or commercial customers.",
  
      websiteCriteria:
        "Look for outdated visual design, weak mobile presentation, unclear enquiry CTA, poor presentation of completed installations, missing trust elements, weak local positioning or confusing service information.",
  
      outreachAngle:
        "Their solar projects and technical expertise may look stronger than their current website represents. Focus on how a clearer and more modern website could communicate trust, completed installations and generate more qualified enquiries.",
  
      emailTone:
        "Short, personal, relaxed and direct. Freelancer-to-business-owner. Mention one specific observation from the actual website instead of using generic sales language.",
  
      followUpDays: 5,
    },
  
    {
      id: "gartenbau",
      name: "Garten- & Landschaftsbau",
      industry: "Garten- und Landschaftsbau",
      category: "Trades",
      fit: "Strong fit",
  
      description:
        "Highly visual work where strong project photography and a modern website can make a large difference.",
  
      companySizePreference:
        "2–30 employees",
  
      targetRoles:
        "Owner, Managing Director, Geschäftsführer, Inhaber",
  
      researchCriteria:
        "Active garden and landscaping company with completed projects, regional customer work and preferably project photos or references.",
  
      websiteCriteria:
        "Look for outdated design, weak galleries, poor mobile layout, low-quality presentation of completed projects, unclear services or missing enquiry CTA.",
  
      outreachAngle:
        "Their actual landscaping work may be much more impressive than the current website presentation. Focus on presenting projects more visually and making it easier for potential customers to request a quote.",
  
      emailTone:
        "Personal, straightforward and friendly. Avoid agency language. Mention a real project, service or website observation when possible.",
  
      followUpDays: 5,
    },
  
    {
      id: "elektriker",
      name: "Elektriker",
      industry: "Elektriker",
      category: "Trades",
      fit: "Strong fit",
  
      description:
        "Local service businesses where credibility, service clarity and easy contact are especially important.",
  
      companySizePreference:
        "2–30 employees",
  
      targetRoles:
        "Owner, Managing Director, Geschäftsführer, Inhaber",
  
      researchCriteria:
        "Active electrical contractor serving residential or business customers. Prefer companies with multiple services, references or a visible regional presence.",
  
      websiteCriteria:
        "Look for older websites, poor mobile experience, unclear service structure, weak contact options, missing references or a website that does not reflect the professionalism of the company.",
  
      outreachAngle:
        "The company appears professional operationally, but the website may not communicate that same quality. Focus on clearer services, trust and easier customer enquiries.",
  
      emailTone:
        "Short, professional but approachable. Personalize using the actual website and avoid exaggerated marketing promises.",
  
      followUpDays: 5,
    },
  
    {
      id: "shk",
      name: "SHK / Wärmepumpen",
      industry: "Sanitär, Heizung & Klima",
      category: "Trades",
      fit: "Strong fit",
  
      description:
        "High-value services where customers often research providers carefully before making contact.",
  
      companySizePreference:
        "2–40 employees",
  
      targetRoles:
        "Owner, Managing Director, Geschäftsführer, Inhaber",
  
      researchCriteria:
        "Active heating, sanitary, HVAC or heat-pump company with regional operations and clearly offered installation or modernization services.",
  
      websiteCriteria:
        "Look for outdated content, confusing service pages, weak presentation of heat-pump or modernization services, missing references, poor mobile experience or unclear enquiry paths.",
  
      outreachAngle:
        "Customers making larger heating or modernization investments need trust and clarity. Focus on improving service presentation, references and the path from website visit to enquiry.",
  
      emailTone:
        "Professional, concise and personal. Focus on one concrete improvement rather than presenting a long list of problems.",
  
      followUpDays: 5,
    },
  
    {
      id: "immobilienmakler",
      name: "Immobilienmakler",
      industry: "Immobilienmakler",
      category: "Real estate",
      fit: "Strong fit",
  
      description:
        "Brand perception and trust matter heavily, while properties and references provide strong visual content.",
  
      companySizePreference:
        "1–20 employees",
  
      targetRoles:
        "Owner, Managing Director, Geschäftsführer, Inhaber",
  
      researchCriteria:
        "Independent or regional real-estate agency with active listings, local expertise and visible sales or property activity.",
  
      websiteCriteria:
        "Look for dated branding, weak property presentation, confusing navigation, generic stock imagery, poor mobile layouts or unclear seller and buyer conversion paths.",
  
      outreachAngle:
        "Their personal service and local expertise may not be reflected strongly enough online. Focus on premium presentation, trust and clearer conversion paths for property owners and buyers.",
  
      emailTone:
        "Personal, polished and concise. Keep the message premium rather than overly sales-focused.",
  
      followUpDays: 5,
    },
  
    {
      id: "hausverwaltung",
      name: "Hausverwaltung",
      industry: "Hausverwaltung",
      category: "Real estate",
      fit: "Good fit",
  
      description:
        "Trust-focused local businesses that often have functional but visually outdated websites.",
  
      companySizePreference:
        "2–30 employees",
  
      targetRoles:
        "Owner, Managing Director, Geschäftsführer, Inhaber",
  
      researchCriteria:
        "Active property management company with a regional customer base and clearly offered management services.",
  
      websiteCriteria:
        "Look for old-fashioned design, unclear service explanations, weak credibility signals, poor mobile experience or complicated contact processes.",
  
      outreachAngle:
        "The website should communicate reliability and professionalism immediately. Focus on making services clearer and giving property owners more confidence before contacting the company.",
  
      emailTone:
        "Professional, respectful and concise. Avoid aggressive marketing language.",
  
      followUpDays: 5,
    },
  
    {
      id: "consulting",
      name: "Unternehmensberatung",
      industry: "Unternehmensberatung",
      category: "B2B",
      fit: "Strong fit",
  
      description:
        "Expertise-driven businesses where positioning, authority and clear messaging directly influence perceived value.",
  
      companySizePreference:
        "1–30 employees",
  
      targetRoles:
        "Founder, Owner, Managing Director, Geschäftsführer",
  
      researchCriteria:
        "Independent consulting company or consultancy with a clear specialization, visible expertise and B2B services.",
  
      websiteCriteria:
        "Look for generic positioning, unclear value proposition, outdated design, excessive text, weak case studies, missing proof or unclear conversion paths.",
  
      outreachAngle:
        "Their expertise may be stronger than their current positioning communicates. Focus on clearer differentiation, stronger authority and a website that supports higher-value client acquisition.",
  
      emailTone:
        "Confident, concise and professional. Personalize around their actual positioning or specialization.",
  
      followUpDays: 5,
    },
  
    {
      id: "it-dienstleister",
      name: "IT-Dienstleister",
      industry: "IT-Dienstleister",
      category: "B2B",
      fit: "Good fit",
  
      description:
        "Technical companies often explain what they do well internally but struggle to communicate it simply to potential customers.",
  
      companySizePreference:
        "2–50 employees",
  
      targetRoles:
        "Founder, Owner, Managing Director, Geschäftsführer",
  
      researchCriteria:
        "Regional IT service provider, system house or managed-service provider offering services to business customers.",
  
      websiteCriteria:
        "Look for technical but unclear messaging, outdated design, confusing service structures, weak differentiation, missing case studies or unclear calls to action.",
  
      outreachAngle:
        "The technical competence is there, but potential customers may struggle to immediately understand the offer and differentiation. Focus on clearer positioning and conversion.",
  
      emailTone:
        "Direct, intelligent and concise. Avoid generic web-design pitches and reference something specific about their service positioning.",
  
      followUpDays: 5,
    },
  ];
  
  /* =========================================================
     GET SINGLE IDEA
  ========================================================= */
  
  export function getCampaignIdea(
    id: string | null | undefined
  ) {
    if (!id) {
      return null;
    }
  
    return (
      CAMPAIGN_IDEAS.find(
        (idea) =>
          idea.id === id
      ) ?? null
    );
  }