export const APP_LANGUAGE_COOKIE =
  "leadbase-language";

export type AppLanguage =
  | "en"
  | "de";

export function normalizeAppLanguage(
  value:
    | string
    | null
    | undefined
): AppLanguage {
  return value ===
    "de"
    ? "de"
    : "en";
}

export const languageCopy = {
  en: {
    sidebar: {
      dashboard:
        "Dashboard",

      findLeads:
        "Find Leads",

      leads:
        "Leads",

      campaigns:
        "Campaigns",

      projects:
        "Projects",

      inbox:
        "Inbox",

      settings:
        "Settings",

      signOut:
        "Sign out",

      privateWorkspace:
        "Private workspace",

      leadWorkspace:
        "Lead workspace",

      closeNavigation:
        "Close navigation",

      openNavigation:
        "Open navigation",

      navigation:
        "Navigation",

      unreadInboxMessages:
        "unread inbox messages",
    },

    settings: {
      eyebrow:
        "Workspace",

      title:
        "Settings",

      description:
        "Manage integrations, appearance, language, outreach preferences and workspace settings.",

      gmailConnectedTitle:
        "Gmail connected successfully",

      gmailConnectedDescription:
        "Your Google Workspace mailbox is ready.",

      appearanceTitle:
        "Appearance",

      appearanceDescription:
        "Choose how Leadbase looks on this device.",

      appearanceNote:
        "System automatically follows your operating system's light or dark appearance.",

      gmailTitle:
        "Gmail",

      gmailDescription:
        "Connect your Google Workspace mailbox for sending and synchronizing lead conversations.",

      connected:
        "Connected",

      notConnected:
        "Not connected",

      gmailNotConnectedNote:
        "Connect Google OAuth before sending outreach emails.",

      sendAccess:
        "Send access",

      inboxSync:
        "Inbox sync",

      oauth:
        "OAuth",

      reconnect:
        "Reconnect",

      connectGmail:
        "Connect Gmail",

      aiTitle:
        "AI",

      aiDescription:
        "AI is used for website analysis, research and personalized email drafts.",

      provider:
        "Provider",

      status:
        "Status",

      configured:
        "Configured",

      notConfigured:
        "Not configured",

      serverKeyDetected:
        "Server-side API key detected",

      serverKeyRequired:
        "Server-side API key required",

      discoveryTitle:
        "Lead discovery",

      discoveryDescription:
        "Sources used to discover and research businesses.",

      localDiscovery:
        "Local discovery",

      businessDiscovery:
        "Business discovery",

      research:
        "Research",

      structuralVisualAnalysis:
        "Structural and visual analysis",

      languageTitle:
        "Language",

      languageDescription:
        "Choose the language used by the Leadbase interface.",

      languageNote:
        "Your language choice is saved on this device and remains active after reloading Leadbase.",

      english:
        "English",

      german:
        "Deutsch",

      outreachTitle:
        "Outreach",

      outreachDescription:
        "Control how email drafts and follow-ups behave.",

      defaultFollowUpDelay:
        "Default follow-up delay",

      followUpDelayNote:
        "Days after sending before a follow-up is prepared.",

      sendingMode:
        "Sending mode",

      humanApprovalRequired:
        "Human approval required",

      automaticSendingDisabled:
        "Automatic sending is disabled.",

      complianceTitle:
        "Compliance & safety",

      complianceDescription:
        "Safeguards applied before outreach can be sent.",

      humanApprovalBeforeSending:
        "Human approval before sending",

      doNotContactSuppression:
        "Do Not Contact suppression",

      noFabricatedContactInformation:
        "No fabricated contact information",

      noTrackingPixels:
        "No tracking pixels in V1",

      noDeceptiveSubjects:
        "No deceptive Re: or Fwd: subjects",

      activitySendingHistory:
        "Activity and sending history",

      deliverabilityTitle:
        "Deliverability",

      deliverabilityDescription:
        "Monitor the technical health of your sending domain and mailbox.",

      notChecked:
        "Not checked",

      verificationLater:
        "Verification will be added later.",
    },

    dashboard: {
      eyebrow:
        "Overview",

      title:
        "Dashboard",

      description:
        "Your live lead pipeline, outreach activity, client projects and revenue in one place.",

      privateWorkspace:
        "Private workspace",

      salesPipeline:
        "Sales pipeline",

      salesPipelineDescription:
        "Current acquisition and outreach performance.",

      newLeads:
        "New leads",

      qualified:
        "Qualified",

      draftsReady:
        "Drafts ready",

      emailsSent:
        "Emails sent",

      replies:
        "Replies",

      callsBooked:
        "Calls booked",

      wonClients:
        "Won clients",

      pipelineValue:
        "Pipeline value",

      revenueProjects:
        "Revenue & projects",

      revenueProjectsDescription:
        "Real client work, kept separate from potential pipeline value.",

      viewProjects:
        "View projects",

      bookedValue:
        "Booked value",

      bookedValueDescription:
        "Total value of non-cancelled client projects.",

      paidRevenue:
        "Paid revenue",

      paidRevenueDescription:
        "Money already recorded as paid.",

      outstanding:
        "Outstanding",

      outstandingDescription:
        "Agreed project value still unpaid.",

      completedProjects:
        "Completed projects",

      completedProjectsDescription:
        "Client projects marked as completed.",

      recentActivity:
        "Recent activity",

      recentActivityDescription:
        "Latest changes across your leads",

      viewLeads:
        "View leads",

      noActivity:
        "No activity yet",

      noActivityDescription:
        "Lead research, outreach and status changes will appear here.",

      activityFallback:
        "Activity",

      unknownCompany:
        "Unknown company",

      pipeline:
        "Pipeline",

      pipelineDescription:
        "Current lead distribution",

      totalLeads:
        "Total leads",

      recentProjects:
        "Recent projects",

      recentProjectsDescription:
        "Latest client work and payment status.",

      allProjects:
        "All projects",

      noProjects:
        "No client projects yet",

      noProjectsDescription:
        "Add your previous projects to start tracking real revenue.",

      completed:
        "Completed",

      started:
        "Started",

      noProjectDate:
        "No project date",

      value:
        "Value",

      paid:
        "Paid",

      open:
        "Open",

      findNewLeads:
        "Find new leads",

      findNewLeadsDescription:
        "Search for companies by industry and location and review them before importing.",

      draftsWaiting:
        "Drafts waiting for review",

      noDraftsWaiting:
        "No personalized outreach drafts are currently waiting for review.",

      oneDraftWaiting:
        "1 personalized draft is ready for review before anything gets sent.",

      manyDraftsWaiting:
        "{count} personalized drafts are ready for review before anything gets sent.",
    },

    projects: {
      eyebrow:
        "Business",

      title:
        "Projects",

      description:
        "Track completed and active client projects, payments and real revenue.",

      addProject:
        "Add project",

      projectValue:
        "Project value",

      paid:
        "Paid",

      outstanding:
        "Outstanding",

      completed:
        "Completed",

      clientProjects:
        "Client projects",

      clientProjectsDescription:
        "Your historical and current paid work.",

      noProjects:
        "No projects yet",

      noProjectsDescription:
        "Add your previous client projects once and Leadbase will calculate your real revenue.",

      addFirstProject:
        "Add first project",

      value:
        "Value",

      open:
        "Open",

      started:
        "Started",

      completedDate:
        "Completed",

      visitWebsite:
        "Visit website",

      edit:
        "Edit",

      delete:
        "Delete",

      statusPlanned:
        "Planned",

      statusInProgress:
        "In progress",

      statusCompleted:
        "Completed",

      statusCancelled:
        "Cancelled",

      backToProjects:
        "Back to projects",

      addPageTitle:
        "Add project",

      addPageDescription:
        "Add completed or active client work to your real revenue history.",

      editPageTitle:
        "Edit project",

      editPageDescription:
        "Update project information, payment status and the live website.",

      projectInformation:
        "Project information",

      createInformationDescription:
        "Use the actual agreed and paid amounts.",

      editInformationDescription:
        "Correct values here whenever a payment, website or project status changes.",

      client:
        "Client",

      project:
        "Project",

      website:
        "Website",

      status:
        "Status",

      totalProjectValue:
        "Total project value",

      alreadyPaid:
        "Already paid",

      startedLabel:
        "Started",

      completedLabel:
        "Completed",

      notes:
        "Notes",

      optionalNotes:
        "Optional internal notes...",

      clientPlaceholder:
        "e.g. Modern Energy Solutions",

      projectPlaceholder:
        "e.g. Company website",

      cancel:
        "Cancel",

      addProjectButton:
        "Add project",

      saveChanges:
        "Save changes",

      clientProjectRequiredError:
        "Client and project name are required.",

      invalidValueError:
        "Project values must be valid positive numbers.",

      missingInformationError:
        "Required information is missing.",
    },
  },

  de: {
    sidebar: {
      dashboard:
        "Dashboard",

      findLeads:
        "Leads finden",

      leads:
        "Leads",

      campaigns:
        "Kampagnen",

      projects:
        "Projekte",

      inbox:
        "Posteingang",

      settings:
        "Einstellungen",

      signOut:
        "Abmelden",

      privateWorkspace:
        "Privater Workspace",

      leadWorkspace:
        "Lead-Workspace",

      closeNavigation:
        "Navigation schließen",

      openNavigation:
        "Navigation öffnen",

      navigation:
        "Navigation",

      unreadInboxMessages:
        "ungelesene Nachrichten im Posteingang",
    },

    settings: {
      eyebrow:
        "Workspace",

      title:
        "Einstellungen",

      description:
        "Verwalte Integrationen, Darstellung, Sprache, Outreach-Einstellungen und deinen Workspace.",

      gmailConnectedTitle:
        "Gmail erfolgreich verbunden",

      gmailConnectedDescription:
        "Dein Google-Workspace-Postfach ist einsatzbereit.",

      appearanceTitle:
        "Darstellung",

      appearanceDescription:
        "Wähle aus, wie Leadbase auf diesem Gerät aussehen soll.",

      appearanceNote:
        "System übernimmt automatisch den Hell- oder Dunkelmodus deines Betriebssystems.",

      gmailTitle:
        "Gmail",

      gmailDescription:
        "Verbinde dein Google-Workspace-Postfach zum Senden und Synchronisieren von Lead-Konversationen.",

      connected:
        "Verbunden",

      notConnected:
        "Nicht verbunden",

      gmailNotConnectedNote:
        "Verbinde Google OAuth, bevor Outreach-E-Mails gesendet werden können.",

      sendAccess:
        "Senden",

      inboxSync:
        "Posteingang-Sync",

      oauth:
        "OAuth",

      reconnect:
        "Neu verbinden",

      connectGmail:
        "Gmail verbinden",

      aiTitle:
        "KI",

      aiDescription:
        "KI wird für Website-Analysen, Recherche und personalisierte E-Mail-Entwürfe verwendet.",

      provider:
        "Anbieter",

      status:
        "Status",

      configured:
        "Konfiguriert",

      notConfigured:
        "Nicht konfiguriert",

      serverKeyDetected:
        "Serverseitiger API-Key erkannt",

      serverKeyRequired:
        "Serverseitiger API-Key erforderlich",

      discoveryTitle:
        "Lead-Suche",

      discoveryDescription:
        "Quellen, die zum Finden und Recherchieren von Unternehmen verwendet werden.",

      localDiscovery:
        "Lokale Suche",

      businessDiscovery:
        "Unternehmenssuche",

      research:
        "Recherche",

      structuralVisualAnalysis:
        "Strukturelle und visuelle Analyse",

      languageTitle:
        "Sprache",

      languageDescription:
        "Wähle die Sprache der Leadbase-Oberfläche.",

      languageNote:
        "Deine Sprachauswahl wird auf diesem Gerät gespeichert und bleibt auch nach dem Neuladen aktiv.",

      english:
        "English",

      german:
        "Deutsch",

      outreachTitle:
        "Outreach",

      outreachDescription:
        "Steuere, wie E-Mail-Entwürfe und Follow-ups funktionieren.",

      defaultFollowUpDelay:
        "Standard-Follow-up-Verzögerung",

      followUpDelayNote:
        "Tage nach dem Versand, bevor ein Follow-up vorbereitet wird.",

      sendingMode:
        "Versandmodus",

      humanApprovalRequired:
        "Manuelle Freigabe erforderlich",

      automaticSendingDisabled:
        "Automatischer Versand ist deaktiviert.",

      complianceTitle:
        "Compliance & Sicherheit",

      complianceDescription:
        "Schutzmaßnahmen, die gelten, bevor Outreach gesendet werden kann.",

      humanApprovalBeforeSending:
        "Manuelle Freigabe vor dem Versand",

      doNotContactSuppression:
        "Do-Not-Contact-Sperre",

      noFabricatedContactInformation:
        "Keine erfundenen Kontaktdaten",

      noTrackingPixels:
        "Keine Tracking-Pixel in V1",

      noDeceptiveSubjects:
        "Keine irreführenden Re:- oder Fwd:-Betreffzeilen",

      activitySendingHistory:
        "Aktivitäts- und Versandhistorie",

      deliverabilityTitle:
        "Zustellbarkeit",

      deliverabilityDescription:
        "Überwache den technischen Zustand deiner Versanddomain und deines Postfachs.",

      notChecked:
        "Nicht geprüft",

      verificationLater:
        "Die automatische Prüfung wird später ergänzt.",
    },

    dashboard: {
      eyebrow:
        "Übersicht",

      title:
        "Dashboard",

      description:
        "Deine aktuelle Lead-Pipeline, Outreach-Aktivität, Kundenprojekte und Umsätze an einem Ort.",

      privateWorkspace:
        "Privater Workspace",

      salesPipeline:
        "Vertriebspipeline",

      salesPipelineDescription:
        "Aktuelle Akquise- und Outreach-Performance.",

      newLeads:
        "Neue Leads",

      qualified:
        "Qualifiziert",

      draftsReady:
        "Entwürfe bereit",

      emailsSent:
        "E-Mails gesendet",

      replies:
        "Antworten",

      callsBooked:
        "Calls gebucht",

      wonClients:
        "Gewonnene Kunden",

      pipelineValue:
        "Pipeline-Wert",

      revenueProjects:
        "Umsatz & Projekte",

      revenueProjectsDescription:
        "Echte Kundenprojekte, getrennt vom potenziellen Pipeline-Wert.",

      viewProjects:
        "Projekte ansehen",

      bookedValue:
        "Auftragswert",

      bookedValueDescription:
        "Gesamtwert aller nicht stornierten Kundenprojekte.",

      paidRevenue:
        "Bezahlt",

      paidRevenueDescription:
        "Betrag, der bereits als bezahlt erfasst wurde.",

      outstanding:
        "Offen",

      outstandingDescription:
        "Vereinbarter Projektwert, der noch nicht bezahlt wurde.",

      completedProjects:
        "Abgeschlossene Projekte",

      completedProjectsDescription:
        "Kundenprojekte mit dem Status abgeschlossen.",

      recentActivity:
        "Letzte Aktivitäten",

      recentActivityDescription:
        "Neueste Änderungen bei deinen Leads",

      viewLeads:
        "Leads ansehen",

      noActivity:
        "Noch keine Aktivitäten",

      noActivityDescription:
        "Lead-Recherche, Outreach und Statusänderungen erscheinen hier.",

      activityFallback:
        "Aktivität",

      unknownCompany:
        "Unbekanntes Unternehmen",

      pipeline:
        "Pipeline",

      pipelineDescription:
        "Aktuelle Lead-Verteilung",

      totalLeads:
        "Leads gesamt",

      recentProjects:
        "Neueste Projekte",

      recentProjectsDescription:
        "Neueste Kundenprojekte und Zahlungsstände.",

      allProjects:
        "Alle Projekte",

      noProjects:
        "Noch keine Kundenprojekte",

      noProjectsDescription:
        "Füge deine bisherigen Projekte hinzu, um deine echten Umsätze zu verfolgen.",

      completed:
        "Abgeschlossen",

      started:
        "Gestartet",

      noProjectDate:
        "Kein Projektdatum",

      value:
        "Wert",

      paid:
        "Bezahlt",

      open:
        "Offen",

      findNewLeads:
        "Neue Leads finden",

      findNewLeadsDescription:
        "Suche Unternehmen nach Branche und Standort und prüfe sie vor dem Import.",

      draftsWaiting:
        "Entwürfe zur Prüfung",

      noDraftsWaiting:
        "Aktuell warten keine personalisierten Outreach-Entwürfe auf deine Prüfung.",

      oneDraftWaiting:
        "1 personalisierter Entwurf ist bereit zur Prüfung, bevor etwas gesendet wird.",

      manyDraftsWaiting:
        "{count} personalisierte Entwürfe sind bereit zur Prüfung, bevor etwas gesendet wird.",
    },

    projects: {
      eyebrow:
        "Business",

      title:
        "Projekte",

      description:
        "Verwalte abgeschlossene und laufende Kundenprojekte, Zahlungen und echte Umsätze.",

      addProject:
        "Projekt hinzufügen",

      projectValue:
        "Projektwert",

      paid:
        "Bezahlt",

      outstanding:
        "Offen",

      completed:
        "Abgeschlossen",

      clientProjects:
        "Kundenprojekte",

      clientProjectsDescription:
        "Deine bisherigen und aktuellen bezahlten Kundenprojekte.",

      noProjects:
        "Noch keine Projekte",

      noProjectsDescription:
        "Füge deine bisherigen Kundenprojekte einmal hinzu und Leadbase berechnet deine echten Umsätze.",

      addFirstProject:
        "Erstes Projekt hinzufügen",

      value:
        "Wert",

      open:
        "Offen",

      started:
        "Gestartet",

      completedDate:
        "Abgeschlossen",

      visitWebsite:
        "Website öffnen",

      edit:
        "Bearbeiten",

      delete:
        "Löschen",

      statusPlanned:
        "Geplant",

      statusInProgress:
        "In Arbeit",

      statusCompleted:
        "Abgeschlossen",

      statusCancelled:
        "Abgebrochen",

      backToProjects:
        "Zurück zu Projekten",

      addPageTitle:
        "Projekt hinzufügen",

      addPageDescription:
        "Füge abgeschlossene oder laufende Kundenprojekte zu deiner echten Umsatzhistorie hinzu.",

      editPageTitle:
        "Projekt bearbeiten",

      editPageDescription:
        "Aktualisiere Projektdaten, Zahlungsstatus und die Live-Website.",

      projectInformation:
        "Projektinformationen",

      createInformationDescription:
        "Verwende die tatsächlich vereinbarten und bezahlten Beträge.",

      editInformationDescription:
        "Passe die Werte an, sobald sich Zahlung, Website oder Projektstatus ändern.",

      client:
        "Kunde",

      project:
        "Projekt",

      website:
        "Website",

      status:
        "Status",

      totalProjectValue:
        "Gesamter Projektwert",

      alreadyPaid:
        "Bereits bezahlt",

      startedLabel:
        "Gestartet",

      completedLabel:
        "Abgeschlossen",

      notes:
        "Notizen",

      optionalNotes:
        "Optionale interne Notizen...",

      clientPlaceholder:
        "z. B. Modern Energy Solutions",

      projectPlaceholder:
        "z. B. Unternehmenswebsite",

      cancel:
        "Abbrechen",

      addProjectButton:
        "Projekt hinzufügen",

      saveChanges:
        "Änderungen speichern",

      clientProjectRequiredError:
        "Kunde und Projektname sind erforderlich.",

      invalidValueError:
        "Projektwerte müssen gültige positive Zahlen sein.",

      missingInformationError:
        "Erforderliche Informationen fehlen.",
    },
  },
} as const;