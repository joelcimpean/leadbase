import {
    type AppLanguage,
  } from "@/lib/i18n";
  
  /* =========================================================
     LEADS TRANSLATIONS
  ========================================================= */
  
  export const leadsCopy = {
    en: {
      common: {
        unknownCompany:
          "Unknown company",
  
        statusNew:
          "New",
  
        statusResearching:
          "Researching",
  
        statusQualified:
          "Qualified",
  
        statusNotAFit:
          "Not a fit",
  
        statusDraftReady:
          "Draft ready",
  
        statusContacted:
          "Contacted",
  
        statusReplied:
          "Replied",
  
        statusCallBooked:
          "Call booked",
  
        statusProposal:
          "Proposal",
  
        statusWon:
          "Won",
  
        statusLost:
          "Lost",
  
        statusDoNotContact:
          "Do not contact",
  
        priorityHigh:
          "High",
  
        priorityMedium:
          "Medium",
  
        priorityLow:
          "Low",
  
        noPriority:
          "No priority",
  
        website:
          "Website",
  
        opportunity:
          "Opportunity",
  
        status:
          "Status",
  
        priority:
          "Priority",
  
        contact:
          "Contact",
  
        location:
          "Location",
  
        industry:
          "Industry",
  
        company:
          "Company",
  
        noWebsite:
          "No website",
  
        noLocation:
          "No location",
  
        contactForm:
          "Contact form",
  
        noEmailFound:
          "No email found",
  
        visitWebsite:
          "Visit website",
  
        openLead:
          "Open lead",
  
        editLead:
          "Edit lead",
  
        cancel:
          "Cancel",
  
        saveChanges:
          "Save changes",
      },
  
      page: {
        eyebrow:
          "CRM",
  
        title:
          "Leads",
  
        description:
          "Review companies, track outreach and see what needs your attention next.",
  
        addLead:
          "Add lead",
      },
  
      table: {
        searchPlaceholder:
          "Search companies...",
  
        filters:
          "Filters",
  
        reset:
          "Reset",
  
        allStatuses:
          "All statuses",
  
        allPriorities:
          "All priorities",
  
        selectedOne:
          "1 lead selected",
  
        selectedMany:
          "{count} leads selected",
  
        visibleWithFilters:
          "{count} currently visible with your filters",
  
        chooseAction:
          "Choose an action for the selected leads.",
  
        clear:
          "Clear",
  
        analyze:
          "Analyze",
  
        analyzing:
          "Analyzing",
  
        analyzeSelected:
          "Analyze selected",
  
        delete:
          "Delete",
  
        deleteSelected:
          "Delete selected",
  
        analysisOneFinished:
          "1 lead has finished analysis.",
  
        analysisManyFinished:
          "{count} leads have finished analysis.",
  
        analysisFailed:
          "Bulk analysis stopped because something went wrong. Existing completed analyses were kept.",
  
        deletedOne:
          "1 lead was deleted.",
  
        deletedMany:
          "{count} leads were deleted.",
  
        deleteFailed:
          "The selected leads could not be deleted.",
  
        selectAllVisible:
          "Select all visible leads",
  
        selectVisible:
          "Select visible",
  
        leadSingular:
          "lead",
  
        leadPlural:
          "leads",
  
        selected:
          "selected",
  
        noMatching:
          "No matching leads",
  
        noMatchingDescription:
          "Try changing your search or filters.",
  
        clearFilters:
          "Clear filters",
  
        actionsFor:
          "Actions for {company}",
  
        selectCompany:
          "Select {company}",
  
        lastContact:
          "Last contact",
  
        next:
          "Next",
  
        nextAction:
          "Next action",
  
        nextStartResearch:
          "Start research",
  
        nextFinishResearch:
          "Finish research",
  
        nextPrepareOutreach:
          "Prepare outreach",
  
        nextReviewDraft:
          "Review draft",
  
        nextWaitForReply:
          "Wait for reply",
  
        nextReviewReply:
          "Review reply",
  
        nextPrepareCall:
          "Prepare call",
  
        nextFollowProposal:
          "Follow proposal",
  
        nextClientWon:
          "Client won",
  
        nextNoAction:
          "No action",
  
        nextBlocked:
          "Blocked",
  
        nextReviewLead:
          "Review lead",
  
        of:
          "of",
  
        deleteDialogTitleOne:
          "Delete 1 lead?",
  
        deleteDialogTitleMany:
          "Delete {count} leads?",
  
        deleteDialogDescription:
          "This permanently removes the selected leads and their related lead data. This action cannot be undone.",
  
        deleting:
          "Deleting...",
  
        deleteLeads:
          "Delete leads",
      },
  
      detail: {
        backToLeads:
          "Back to leads",
  
        edit:
          "Edit",
  
        update:
          "Update",
  
        websiteScore:
          "Website score",
  
        opportunityScore:
          "Opportunity score",
  
        estimatedValue:
          "Estimated value",
  
        overview:
          "Overview",
  
        created:
          "Created",
  
        lastContact:
          "Last contact",
  
        nextFollowUp:
          "Next follow-up",
  
        visualAnalysis:
          "Visual analysis",
  
        visualAnalysisDescription:
          "AI review of desktop and mobile presentation.",
  
        analyzed:
          "Analyzed",
  
        analyzing:
          "Analyzing",
  
        failed:
          "Failed",
  
        notAnalyzed:
          "Not analyzed",
  
        visualAnalysisFailed:
          "Visual analysis failed",
  
        visualAnalysisFailedDescription:
          "Visual analysis could not be completed.",
  
        noVisualAnalysis:
          "No visual analysis yet",
  
        noVisualAnalysisDescription:
          "Analyze the website to create desktop and mobile screenshots and evaluate the design.",
  
        visualAnalysisInProgress:
          "Visual analysis in progress",
  
        structural:
          "Structural",
  
        visual:
          "Visual",
  
        redesignPotential:
          "Redesign potential",
  
        modernity:
          "Modernity",
  
        visualHierarchy:
          "Visual hierarchy",
  
        typography:
          "Typography",
  
        spacing:
          "Spacing",
  
        branding:
          "Branding",
  
        imagery:
          "Imagery",
  
        ctaVisibility:
          "CTA visibility",
  
        mobileQuality:
          "Mobile quality",
  
        projectPresentation:
          "Project presentation",
  
        strengths:
          "Strengths",
  
        weaknesses:
          "Weaknesses",
  
        visualSummary:
          "Visual summary",
  
        redesignReason:
          "Redesign reason",
  
        suggestedOutreachAngle:
          "Suggested outreach angle",
  
        lastAnalyzed:
          "Last analyzed",
  
        input:
          "Input",
  
        output:
          "Output",
  
        structuralAnalysis:
          "Structural analysis",
  
        structuralAnalysisDescription:
          "Multi-page analysis of structure, content and conversion signals.",
  
        structuralAnalysisFailed:
          "Structural analysis failed",
  
        analysisFailed:
          "Analysis failed.",
  
        detected:
          "Detected",
  
        notDetected:
          "Not detected",
  
        finding:
          "Finding",
  
        companyDescription:
          "Company description",
  
        noCompanyDescription:
          "No company description available yet.",
  
        notes:
          "Notes",
  
        noNotes:
          "No notes yet.",
  
        primaryContact:
          "Primary contact",
  
        contactPerson:
          "Contact person",
  
        noContactPerson:
          "No contact person found",
  
        jobTitle:
          "Job title",
  
        email:
          "Email",
  
        phone:
          "Phone",
  
        noPhoneFound:
          "No phone found",
  
        companyLinks:
          "Company links",
  
        contactForm:
          "Contact form",
  
        notFound:
          "Not found",
  
        thisLead:
          "this lead",
      },
  
      edit: {
        backToLead:
          "Back to lead",
  
        title:
          "Edit lead",
  
        description:
          "Update company, contact and opportunity information.",
  
        companyInformation:
          "Company information",
  
        companyInformationDescription:
          "Basic information about the business.",
  
        companyName:
          "Company name",
  
        website:
          "Website",
  
        industry:
          "Industry",
  
        location:
          "Location",
  
        companyPhone:
          "Company phone",
  
        contactForm:
          "Contact form",
  
        companyDescription:
          "Company description",
  
        companyDescriptionPlaceholder:
          "Short company description...",
  
        primaryContact:
          "Primary contact",
  
        primaryContactDescription:
          "Leave fields empty when the information is not known.",
  
        contactPerson:
          "Contact person",
  
        jobTitle:
          "Job title",
  
        email:
          "Email",
  
        phone:
          "Phone",
  
        opportunity:
          "Opportunity",
  
        opportunityDescription:
          "Assign the lead to a campaign and define its sales potential.",
  
        campaign:
          "Campaign",
  
        noCampaign:
          "No campaign",
  
        priority:
          "Priority",
  
        noPriority:
          "No priority",
  
        priorityLow:
          "Low",
  
        priorityMedium:
          "Medium",
  
        priorityHigh:
          "High",
  
        estimatedProjectValue:
          "Estimated project value",
  
        estimatedProjectValuePlaceholder:
          "e.g. 1500",
  
        notes:
          "Notes",
  
        notesPlaceholder:
          "Internal notes about this lead...",
  
        campaignDraft:
          "draft",
  
        campaignPaused:
          "paused",
  
        campaignArchived:
          "archived",
  
        campaignInactive:
          "inactive",
      },
  
      outreach: {
        title:
          "Outreach draft",
  
        statusApproved:
          "Approved",
  
        statusSending:
          "Sending",
  
        statusSent:
          "Sent",
  
        statusArchived:
          "Archived",
  
        statusDraft:
          "Draft",
  
        personalizedForPerson:
          "Personalized email for {name}.",
  
        personalizedForCompany:
          "Personalized email for {name}.",
  
        personalizedBasedOnResearch:
          "Personalized email based on the current research.",
  
        noDraft:
          "No outreach draft yet",
  
        noDraftDescription:
          "Generate a personalized German email using the company and website research.",
  
        recipient:
          "Recipient",
  
        unknownRecipient:
          "Unknown recipient",
  
        noEmailAddress:
          "No email address found",
  
        salutation:
          "Salutation",
  
        neutral:
          "Neutral",
  
        save:
          "Save",
  
        preview:
          "Preview",
  
        subject:
          "Subject",
  
        sent:
          "Sent",
  
        to:
          "to",
  
        emailCouldNotBeSent:
          "Email could not be sent",
  
        personalizedUsingOne:
          "Personalized using 1 company insight",
  
        personalizedUsingMany:
          "Personalized using {count} company insights",
  
        approveDraft:
          "Approve draft",
  
        readyToSend:
          "Ready to send",
  
        sending:
          "Sending...",
  
        emailSent:
          "Email sent",
  
        followUp:
          "Follow-up",
  
        followUpSentAt:
          "Sent {date}",
  
        followUpDue:
          "Follow-up is due now",
  
        scheduledFor:
          "Scheduled for {date}",
  
        noFollowUpScheduled:
          "No follow-up date scheduled.",
  
        followUpSent:
          "Follow-up sent",
  
        waiting:
          "Waiting",
  
        followUpCouldNotBeSent:
          "Follow-up could not be sent",
  
        previewFollowUp:
          "Preview follow-up",
  
        editDraft:
          "Edit draft",
  
        message:
          "Message",
  
        signatureAddedAutomatically:
          "Signature added automatically",
  
        editApprovedWarning:
          "Editing an approved draft will require approval again before sending.",
  
        personalizationDetails:
          "Personalization details",
  
        oneInsight:
          "1 insight",
  
        manyInsights:
          "{count} insights",
  
        generationDeliveryDetails:
          "Generation & delivery details",
  
        model:
          "Model",
  
        generated:
          "Generated",
  
        totalTokens:
          "Total tokens",
  
        channel:
          "Channel",
  
        gmailMessageId:
          "Gmail message ID",
  
        followUpGmailId:
          "Follow-up Gmail ID",
      },
    },
  
    de: {
      common: {
        unknownCompany:
          "Unbekanntes Unternehmen",
  
        statusNew:
          "Neu",
  
        statusResearching:
          "Recherche",
  
        statusQualified:
          "Qualifiziert",
  
        statusNotAFit:
          "Nicht passend",
  
        statusDraftReady:
          "Entwurf bereit",
  
        statusContacted:
          "Kontaktiert",
  
        statusReplied:
          "Geantwortet",
  
        statusCallBooked:
          "Call gebucht",
  
        statusProposal:
          "Angebot",
  
        statusWon:
          "Gewonnen",
  
        statusLost:
          "Verloren",
  
        statusDoNotContact:
          "Nicht kontaktieren",
  
        priorityHigh:
          "Hoch",
  
        priorityMedium:
          "Mittel",
  
        priorityLow:
          "Niedrig",
  
        noPriority:
          "Keine Priorität",
  
        website:
          "Website",
  
        opportunity:
          "Potenzial",
  
        status:
          "Status",
  
        priority:
          "Priorität",
  
        contact:
          "Kontakt",
  
        location:
          "Standort",
  
        industry:
          "Branche",
  
        company:
          "Unternehmen",
  
        noWebsite:
          "Keine Website",
  
        noLocation:
          "Kein Standort",
  
        contactForm:
          "Kontaktformular",
  
        noEmailFound:
          "Keine E-Mail gefunden",
  
        visitWebsite:
          "Website öffnen",
  
        openLead:
          "Lead öffnen",
  
        editLead:
          "Lead bearbeiten",
  
        cancel:
          "Abbrechen",
  
        saveChanges:
          "Änderungen speichern",
      },
  
      page: {
        eyebrow:
          "CRM",
  
        title:
          "Leads",
  
        description:
          "Prüfe Unternehmen, verfolge deinen Outreach und sieh, welche Leads als Nächstes deine Aufmerksamkeit brauchen.",
  
        addLead:
          "Lead hinzufügen",
      },
  
      table: {
        searchPlaceholder:
          "Unternehmen suchen...",
  
        filters:
          "Filter",
  
        reset:
          "Zurücksetzen",
  
        allStatuses:
          "Alle Status",
  
        allPriorities:
          "Alle Prioritäten",
  
        selectedOne:
          "1 Lead ausgewählt",
  
        selectedMany:
          "{count} Leads ausgewählt",
  
        visibleWithFilters:
          "{count} mit deinen Filtern aktuell sichtbar",
  
        chooseAction:
          "Wähle eine Aktion für die ausgewählten Leads.",
  
        clear:
          "Auswahl aufheben",
  
        analyze:
          "Analysieren",
  
        analyzing:
          "Analysieren",
  
        analyzeSelected:
          "Auswahl analysieren",
  
        delete:
          "Löschen",
  
        deleteSelected:
          "Auswahl löschen",
  
        analysisOneFinished:
          "Die Analyse von 1 Lead wurde abgeschlossen.",
  
        analysisManyFinished:
          "Die Analyse von {count} Leads wurde abgeschlossen.",
  
        analysisFailed:
          "Die Mehrfachanalyse wurde wegen eines Fehlers gestoppt. Bereits abgeschlossene Analysen bleiben erhalten.",
  
        deletedOne:
          "1 Lead wurde gelöscht.",
  
        deletedMany:
          "{count} Leads wurden gelöscht.",
  
        deleteFailed:
          "Die ausgewählten Leads konnten nicht gelöscht werden.",
  
        selectAllVisible:
          "Alle sichtbaren Leads auswählen",
  
        selectVisible:
          "Sichtbare auswählen",
  
        leadSingular:
          "Lead",
  
        leadPlural:
          "Leads",
  
        selected:
          "ausgewählt",
  
        noMatching:
          "Keine passenden Leads",
  
        noMatchingDescription:
          "Ändere deine Suche oder Filter.",
  
        clearFilters:
          "Filter löschen",
  
        actionsFor:
          "Aktionen für {company}",
  
        selectCompany:
          "{company} auswählen",
  
        lastContact:
          "Letzter Kontakt",
  
        next:
          "Nächster Schritt",
  
        nextAction:
          "Nächster Schritt",
  
        nextStartResearch:
          "Recherche starten",
  
        nextFinishResearch:
          "Recherche abschließen",
  
        nextPrepareOutreach:
          "Outreach vorbereiten",
  
        nextReviewDraft:
          "Entwurf prüfen",
  
        nextWaitForReply:
          "Auf Antwort warten",
  
        nextReviewReply:
          "Antwort prüfen",
  
        nextPrepareCall:
          "Call vorbereiten",
  
        nextFollowProposal:
          "Angebot nachfassen",
  
        nextClientWon:
          "Kunde gewonnen",
  
        nextNoAction:
          "Keine Aktion",
  
        nextBlocked:
          "Gesperrt",
  
        nextReviewLead:
          "Lead prüfen",
  
        of:
          "von",
  
        deleteDialogTitleOne:
          "1 Lead löschen?",
  
        deleteDialogTitleMany:
          "{count} Leads löschen?",
  
        deleteDialogDescription:
          "Dadurch werden die ausgewählten Leads und die zugehörigen Lead-Daten dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.",
  
        deleting:
          "Wird gelöscht...",
  
        deleteLeads:
          "Leads löschen",
      },
  
      detail: {
        backToLeads:
          "Zurück zu Leads",
  
        edit:
          "Bearbeiten",
  
        update:
          "Aktualisieren",
  
        websiteScore:
          "Website-Score",
  
        opportunityScore:
          "Potenzial-Score",
  
        estimatedValue:
          "Geschätzter Wert",
  
        overview:
          "Übersicht",
  
        created:
          "Erstellt",
  
        lastContact:
          "Letzter Kontakt",
  
        nextFollowUp:
          "Nächstes Follow-up",
  
        visualAnalysis:
          "Visuelle Analyse",
  
        visualAnalysisDescription:
          "KI-Analyse der Desktop- und Mobile-Darstellung.",
  
        analyzed:
          "Analysiert",
  
        analyzing:
          "Wird analysiert",
  
        failed:
          "Fehlgeschlagen",
  
        notAnalyzed:
          "Nicht analysiert",
  
        visualAnalysisFailed:
          "Visuelle Analyse fehlgeschlagen",
  
        visualAnalysisFailedDescription:
          "Die visuelle Analyse konnte nicht abgeschlossen werden.",
  
        noVisualAnalysis:
          "Noch keine visuelle Analyse",
  
        noVisualAnalysisDescription:
          "Analysiere die Website, um Desktop- und Mobile-Screenshots zu erstellen und das Design auszuwerten.",
  
        visualAnalysisInProgress:
          "Visuelle Analyse läuft",
  
        structural:
          "Struktur",
  
        visual:
          "Visuell",
  
        redesignPotential:
          "Redesign-Potenzial",
  
        modernity:
          "Modernität",
  
        visualHierarchy:
          "Visuelle Hierarchie",
  
        typography:
          "Typografie",
  
        spacing:
          "Abstände",
  
        branding:
          "Branding",
  
        imagery:
          "Bildsprache",
  
        ctaVisibility:
          "CTA-Sichtbarkeit",
  
        mobileQuality:
          "Mobile Qualität",
  
        projectPresentation:
          "Projektpräsentation",
  
        strengths:
          "Stärken",
  
        weaknesses:
          "Schwächen",
  
        visualSummary:
          "Visuelle Zusammenfassung",
  
        redesignReason:
          "Grund für Redesign",
  
        suggestedOutreachAngle:
          "Empfohlener Outreach-Ansatz",
  
        lastAnalyzed:
          "Zuletzt analysiert",
  
        input:
          "Input",
  
        output:
          "Output",
  
        structuralAnalysis:
          "Strukturelle Analyse",
  
        structuralAnalysisDescription:
          "Mehrseitige Analyse von Struktur, Inhalten und Conversion-Signalen.",
  
        structuralAnalysisFailed:
          "Strukturelle Analyse fehlgeschlagen",
  
        analysisFailed:
          "Analyse fehlgeschlagen.",
  
        detected:
          "Erkannt",
  
        notDetected:
          "Nicht erkannt",
  
        finding:
          "Ergebnis",
  
        companyDescription:
          "Unternehmensbeschreibung",
  
        noCompanyDescription:
          "Noch keine Unternehmensbeschreibung vorhanden.",
  
        notes:
          "Notizen",
  
        noNotes:
          "Noch keine Notizen.",
  
        primaryContact:
          "Hauptkontakt",
  
        contactPerson:
          "Ansprechpartner",
  
        noContactPerson:
          "Kein Ansprechpartner gefunden",
  
        jobTitle:
          "Position",
  
        email:
          "E-Mail",
  
        phone:
          "Telefon",
  
        noPhoneFound:
          "Keine Telefonnummer gefunden",
  
        companyLinks:
          "Unternehmenslinks",
  
        contactForm:
          "Kontaktformular",
  
        notFound:
          "Nicht gefunden",
  
        thisLead:
          "diesen Lead",
      },
  
      edit: {
        backToLead:
          "Zurück zum Lead",
  
        title:
          "Lead bearbeiten",
  
        description:
          "Aktualisiere Unternehmens-, Kontakt- und Potenzialdaten.",
  
        companyInformation:
          "Unternehmensinformationen",
  
        companyInformationDescription:
          "Grundlegende Informationen über das Unternehmen.",
  
        companyName:
          "Unternehmensname",
  
        website:
          "Website",
  
        industry:
          "Branche",
  
        location:
          "Standort",
  
        companyPhone:
          "Unternehmenstelefon",
  
        contactForm:
          "Kontaktformular",
  
        companyDescription:
          "Unternehmensbeschreibung",
  
        companyDescriptionPlaceholder:
          "Kurze Unternehmensbeschreibung...",
  
        primaryContact:
          "Hauptkontakt",
  
        primaryContactDescription:
          "Lass Felder leer, wenn die Information nicht bekannt ist.",
  
        contactPerson:
          "Ansprechpartner",
  
        jobTitle:
          "Position",
  
        email:
          "E-Mail",
  
        phone:
          "Telefon",
  
        opportunity:
          "Potenzial",
  
        opportunityDescription:
          "Ordne den Lead einer Kampagne zu und definiere sein Verkaufspotenzial.",
  
        campaign:
          "Kampagne",
  
        noCampaign:
          "Keine Kampagne",
  
        priority:
          "Priorität",
  
        noPriority:
          "Keine Priorität",
  
        priorityLow:
          "Niedrig",
  
        priorityMedium:
          "Mittel",
  
        priorityHigh:
          "Hoch",
  
        estimatedProjectValue:
          "Geschätzter Projektwert",
  
        estimatedProjectValuePlaceholder:
          "z. B. 1500",
  
        notes:
          "Notizen",
  
        notesPlaceholder:
          "Interne Notizen zu diesem Lead...",
  
        campaignDraft:
          "Entwurf",
  
        campaignPaused:
          "pausiert",
  
        campaignArchived:
          "archiviert",
  
        campaignInactive:
          "inaktiv",
      },
  
      outreach: {
        title:
          "Outreach-Entwurf",
  
        statusApproved:
          "Freigegeben",
  
        statusSending:
          "Wird gesendet",
  
        statusSent:
          "Gesendet",
  
        statusArchived:
          "Archiviert",
  
        statusDraft:
          "Entwurf",
  
        personalizedForPerson:
          "Personalisierte E-Mail für {name}.",
  
        personalizedForCompany:
          "Personalisierte E-Mail für {name}.",
  
        personalizedBasedOnResearch:
          "Personalisierte E-Mail basierend auf der aktuellen Recherche.",
  
        noDraft:
          "Noch kein Outreach-Entwurf",
  
        noDraftDescription:
          "Erstelle eine personalisierte deutsche E-Mail anhand der Unternehmens- und Website-Recherche.",
  
        recipient:
          "Empfänger",
  
        unknownRecipient:
          "Unbekannter Empfänger",
  
        noEmailAddress:
          "Keine E-Mail-Adresse gefunden",
  
        salutation:
          "Anrede",
  
        neutral:
          "Neutral",
  
        save:
          "Speichern",
  
        preview:
          "Vorschau",
  
        subject:
          "Betreff",
  
        sent:
          "Gesendet",
  
        to:
          "an",
  
        emailCouldNotBeSent:
          "E-Mail konnte nicht gesendet werden",
  
        personalizedUsingOne:
          "Personalisiert mit 1 Unternehmensinformation",
  
        personalizedUsingMany:
          "Personalisiert mit {count} Unternehmensinformationen",
  
        approveDraft:
          "Entwurf freigeben",
  
        readyToSend:
          "Bereit zum Senden",
  
        sending:
          "Wird gesendet...",
  
        emailSent:
          "E-Mail gesendet",
  
        followUp:
          "Follow-up",
  
        followUpSentAt:
          "Gesendet {date}",
  
        followUpDue:
          "Follow-up ist jetzt fällig",
  
        scheduledFor:
          "Geplant für {date}",
  
        noFollowUpScheduled:
          "Kein Follow-up-Datum geplant.",
  
        followUpSent:
          "Follow-up gesendet",
  
        waiting:
          "Wartet",
  
        followUpCouldNotBeSent:
          "Follow-up konnte nicht gesendet werden",
  
        previewFollowUp:
          "Follow-up anzeigen",
  
        editDraft:
          "Entwurf bearbeiten",
  
        message:
          "Nachricht",
  
        signatureAddedAutomatically:
          "Signatur wird automatisch hinzugefügt",
  
        editApprovedWarning:
          "Wenn du einen freigegebenen Entwurf bearbeitest, muss er vor dem Versand erneut freigegeben werden.",
  
        personalizationDetails:
          "Personalisierungsdetails",
  
        oneInsight:
          "1 Information",
  
        manyInsights:
          "{count} Informationen",
  
        generationDeliveryDetails:
          "Generierungs- & Versanddetails",
  
        model:
          "Modell",
  
        generated:
          "Generiert",
  
        totalTokens:
          "Tokens gesamt",
  
        channel:
          "Kanal",
  
        gmailMessageId:
          "Gmail-Nachrichten-ID",
  
        followUpGmailId:
          "Follow-up Gmail-ID",
      },
    },
  } as const;
  
  export function getLeadStatusLabel(
    status: string,
    language: AppLanguage
  ) {
    const text =
      leadsCopy[
        language
      ].common;
  
    switch (status) {
      case "NEW":
        return text.statusNew;
  
      case "RESEARCHING":
        return text.statusResearching;
  
      case "QUALIFIED":
        return text.statusQualified;
  
      case "NOT_A_FIT":
        return text.statusNotAFit;
  
      case "DRAFT_READY":
        return text.statusDraftReady;
  
      case "CONTACTED":
        return text.statusContacted;
  
      case "REPLIED":
        return text.statusReplied;
  
      case "CALL_BOOKED":
        return text.statusCallBooked;
  
      case "PROPOSAL":
        return text.statusProposal;
  
      case "WON":
        return text.statusWon;
  
      case "LOST":
        return text.statusLost;
  
      case "DO_NOT_CONTACT":
        return text.statusDoNotContact;
  
      default:
        return status;
    }
  }
  
  export function getLeadPriorityLabel(
    priority:
      | string
      | null,
    language: AppLanguage
  ) {
    const text =
      leadsCopy[
        language
      ].common;
  
    switch (priority) {
      case "HIGH":
        return text.priorityHigh;
  
      case "MEDIUM":
        return text.priorityMedium;
  
      case "LOW":
        return text.priorityLow;
  
      default:
        return text.noPriority;
    }
  }